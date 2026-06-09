import { randomUUID } from "node:crypto"
import { ORPCError } from "@orpc/server"
import { db } from "@wtrn/db"
import { and, desc, eq, sandbox } from "@wtrn/db-schema"
import { sandboxStatusSchema } from "@wtrn/rpc-contract"
import { env } from "../env.ts"
import { secured } from "../rpc.ts"
import { createSandboxPod, deleteSandboxPod } from "./driver.ts"
import { getKubernetesErrorMessage } from "./k8s.ts"
import { buildSandboxPod, podNameForSandbox } from "./pod-spec.ts"

type SandboxRow = typeof sandbox.$inferSelect

const TERMINAL_STATUSES = new Set(["stopped", "failed"])

// busybox sleep does not support "infinity"; max int32 seconds ~= 68 years.
const DEFAULT_IMAGE_COMMAND = ["sleep", "2147483647"]

export const sandboxRouter = {
	create: secured.sandbox.create.handler(async ({ context, input }) => {
		const id = randomUUID()
		const image = input.image ?? env.SANDBOX_DEFAULT_IMAGE
		const command = input.command ?? (input.image ? undefined : DEFAULT_IMAGE_COMMAND)

		// Insert before creating the pod so a crash can never leave a pod
		// that no row accounts for; the reconciler cleans up the inverse.
		const insertedSandboxes = await db
			.insert(sandbox)
			.values({
				command,
				createdByUserId: context.authSession.user.id,
				env: input.env,
				id,
				image,
				name: input.name ?? null,
				namespace: env.SANDBOX_NAMESPACE,
				podName: podNameForSandbox(id),
				status: "starting",
			})
			.returning()
		const insertedSandbox = insertedSandboxes[0]

		if (!insertedSandbox) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to persist sandbox",
			})
		}

		try {
			await createSandboxPod(buildSandboxPod({ command, env: input.env, image, sandboxId: id }))
		} catch (error) {
			const failedSandboxes = await db
				.update(sandbox)
				.set({
					finishedAt: new Date(),
					status: "failed",
					statusReason: getKubernetesErrorMessage(error),
				})
				.where(eq(sandbox.id, id))
				.returning()

			return serializeSandbox(failedSandboxes[0] ?? insertedSandbox)
		}

		return serializeSandbox(insertedSandbox)
	}),
	get: secured.sandbox.get.handler(async ({ context, input }) => {
		const currentSandbox = await findOwnedSandbox(input.id, context.authSession.user.id)

		return serializeSandbox(currentSandbox)
	}),
	kill: secured.sandbox.kill.handler(async ({ context, input }) => {
		const currentSandbox = await findOwnedSandbox(input.id, context.authSession.user.id)

		if (TERMINAL_STATUSES.has(currentSandbox.status)) {
			return serializeSandbox(currentSandbox)
		}

		await deleteSandboxPod(currentSandbox.podName, { force: true })

		const updatedSandboxes = await db
			.update(sandbox)
			.set({
				finishedAt: currentSandbox.finishedAt ?? new Date(),
				status: "stopped",
				statusReason: "killed",
			})
			.where(eq(sandbox.id, currentSandbox.id))
			.returning()

		return serializeSandbox(updatedSandboxes[0] ?? currentSandbox)
	}),
	list: secured.sandbox.list.handler(async ({ context }) => {
		const sandboxes = await db
			.select()
			.from(sandbox)
			.where(eq(sandbox.createdByUserId, context.authSession.user.id))
			.orderBy(desc(sandbox.createdAt))

		return { sandboxes: sandboxes.map(serializeSandbox) }
	}),
	stop: secured.sandbox.stop.handler(async ({ context, input }) => {
		const currentSandbox = await findOwnedSandbox(input.id, context.authSession.user.id)

		if (TERMINAL_STATUSES.has(currentSandbox.status) || currentSandbox.status === "stopping") {
			return serializeSandbox(currentSandbox)
		}

		await deleteSandboxPod(currentSandbox.podName, { force: false })

		const updatedSandboxes = await db
			.update(sandbox)
			.set({
				status: "stopping",
				statusReason: null,
			})
			.where(and(eq(sandbox.id, currentSandbox.id), eq(sandbox.status, currentSandbox.status)))
			.returning()

		return serializeSandbox(updatedSandboxes[0] ?? currentSandbox)
	}),
}

async function findOwnedSandbox(id: string, userId: string): Promise<SandboxRow> {
	const selectedSandboxes = await db
		.select()
		.from(sandbox)
		.where(and(eq(sandbox.id, id), eq(sandbox.createdByUserId, userId)))
		.limit(1)
	const currentSandbox = selectedSandboxes[0]

	if (!currentSandbox) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sandbox not found",
		})
	}

	return currentSandbox
}

function serializeSandbox(row: SandboxRow) {
	return {
		createdAt: row.createdAt.toISOString(),
		env: row.env,
		finishedAt: row.finishedAt?.toISOString() ?? null,
		id: row.id,
		image: row.image,
		name: row.name,
		namespace: row.namespace,
		podName: row.podName,
		startedAt: row.startedAt?.toISOString() ?? null,
		status: sandboxStatusSchema.parse(row.status),
		statusReason: row.statusReason,
	}
}
