import { randomUUID } from "node:crypto"
import { ORPCError } from "@orpc/server"
import { db } from "@wtrn/db"
import { and, desc, eq, sandbox } from "@wtrn/db-schema"
import { sandboxStatusSchema } from "@wtrn/rpc-contract"
import { env } from "../env.ts"
import { secured } from "../rpc.ts"
import {
	createSandboxPod,
	createSandboxSecret,
	deleteSandboxPod,
	deleteSandboxSecret,
	readSandboxPodLogs,
} from "./driver.ts"
import { execInSandboxPod } from "./exec.ts"
import { getKubernetesErrorMessage } from "./k8s.ts"
import { buildSandboxPod, buildSandboxSecret, podNameForSandbox } from "./pod-spec.ts"

type SandboxRow = typeof sandbox.$inferSelect

const TERMINAL_STATUSES = new Set(["stopped", "failed"])

export const sandboxRouter = {
	create: secured.sandbox.create.handler(async ({ context, input }) => {
		const id = randomUUID()
		const image = input.image ?? env.SANDBOX_DEFAULT_IMAGE
		const command = input.command
		// Only persist resources when the user actually overrode something, so
		// the env defaults keep applying to rows with no stored overrides.
		const resources =
			input.resources && Object.values(input.resources).some(Boolean) ? input.resources : null

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
				resources,
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
			await createSandboxSecret(buildSandboxSecret({ env: input.env, sandboxId: id }))
			await createSandboxPod(buildSandboxPod({ command, image, resources, sandboxId: id }))
		} catch (error) {
			await deleteSandboxSecret(podNameForSandbox(id)).catch(() => {})

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
	exec: secured.sandbox.exec.handler(async ({ context, input }) => {
		const currentSandbox = await findOwnedSandbox(input.id, context.authSession.user.id)

		if (currentSandbox.status !== "running") {
			throw new ORPCError("BAD_REQUEST", {
				message: `Sandbox is ${currentSandbox.status}, not running`,
			})
		}

		try {
			return await execInSandboxPod(currentSandbox.podName, input.command)
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", {
				message: getKubernetesErrorMessage(error),
			})
		}
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
		await deleteSandboxSecret(currentSandbox.podName)

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
	logs: secured.sandbox.logs.handler(async ({ context, input }) => {
		const currentSandbox = await findOwnedSandbox(input.id, context.authSession.user.id)

		return readSandboxPodLogs(currentSandbox.podName, input.tailLines)
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

		// envFrom is resolved at container start, so the secret can go now
		// even while the pod terminates gracefully.
		await deleteSandboxPod(currentSandbox.podName, { force: false })
		await deleteSandboxSecret(currentSandbox.podName)

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
		resources: row.resources ?? null,
		startedAt: row.startedAt?.toISOString() ?? null,
		status: sandboxStatusSchema.parse(row.status),
		statusReason: row.statusReason,
	}
}
