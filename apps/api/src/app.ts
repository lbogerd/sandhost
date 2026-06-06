import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { auth } from "./auth.ts"
import { env } from "./env.ts"
import { cors } from "hono/cors"
import { db } from "@wtrn/db"
import {
	and,
	asc,
	eq,
	inArray,
	like,
	runner,
	runnerCommand,
	runnerHeartbeat,
	user,
} from "@wtrn/db-schema"
import { RPCHandler } from "@orpc/server/fetch"
import { onError, ORPCError } from "@orpc/server"
import { randomUUID } from "node:crypto"
import { runnerCommandSchema } from "@wtrn/rpc-contract"
import { createRpcContext, os, runnerSecured, secured } from "./rpc.ts"

const app = new Hono()

const corsMiddleware = cors({
	origin: env.TRUSTED_ORIGINS,
	allowHeaders: ["Content-Type", "Authorization"],
	allowMethods: ["POST", "GET", "OPTIONS"],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: true,
})

export const router = os.router({
	authStatus: secured.authStatus.handler(({ context }) => ({
		message: `It worked! Your email: ${context.authSession.user.email}`,
		user: {
			id: context.authSession.user.id,
			email: context.authSession.user.email,
			name: context.authSession.user.name,
		},
	})),
	createRunnerApiKey: secured.createRunnerApiKey.handler(async ({ context, input }) => {
		const apiKey = await auth.api.createApiKey({
			body: {
				configId: "runner",
				metadata: {
					runnerId: input.runnerId,
				},
				name: input.name,
				permissions: {
					runner: ["heartbeat", "sandbox:event"],
				},
				rateLimitEnabled: false,
				userId: context.authSession.user.id,
			},
		})

		if (!apiKey.key) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Better Auth did not return the generated API key",
			})
		}

		return {
			apiKey: apiKey.key,
			name: input.name,
			runnerId: input.runnerId,
		}
	}),
	hello: os.hello.handler(({ input }) => ({
		message: `Hello, ${input.name}!`,
	})),
	runner: {
		heartbeat: runnerSecured.runner.heartbeat.handler(async ({ context, input }) => {
			if (context.runner.id !== input.runnerId) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Runner ID does not match API key metadata",
				})
			}

			const acceptedAt = new Date()

			await db
				.insert(runner)
				.values({
					hostname: input.hostname,
					id: input.runnerId,
					lastSeenAt: acceptedAt,
					status: "online",
				})
				.onConflictDoUpdate({
					set: {
						hostname: input.hostname,
						lastSeenAt: acceptedAt,
						status: "online",
					},
					target: runner.id,
				})

			await db.insert(runnerHeartbeat).values({
				cpuUsagePercent: input.resources.cpuUsagePercent,
				id: randomUUID(),
				memoryFreeBytes: input.resources.memoryFreeBytes,
				memoryTotalBytes: input.resources.memoryTotalBytes,
				reportedAt: acceptedAt,
				runnerId: input.runnerId,
				runningSandboxCount: input.sandboxes.filter((sandbox) => sandbox.state === "running")
					.length,
			})

			const pendingCommands = await claimPendingCommands(input.runnerId, acceptedAt)

			return {
				acceptedAt: acceptedAt.toISOString(),
				commands: pendingCommands,
			}
		}),
	},
})

async function claimPendingCommands(runnerId: string, claimedAt: Date) {
	return db.transaction(async (tx) => {
		const pendingCommands = await tx
			.select()
			.from(runnerCommand)
			.where(and(eq(runnerCommand.runnerId, runnerId), eq(runnerCommand.status, "pending")))
			.orderBy(asc(runnerCommand.createdAt))
			.limit(10)

		if (pendingCommands.length === 0) return []

		const claimedCommands = await tx
			.update(runnerCommand)
			.set({
				claimedAt,
				status: "claimed",
			})
			.where(
				and(
					eq(runnerCommand.status, "pending"),
					inArray(
						runnerCommand.id,
						pendingCommands.map((command) => command.id),
					),
				),
			)
			.returning()

		return claimedCommands.map((command) =>
			runnerCommandSchema.parse({
				id: command.id,
				type: command.type,
				...getCommandPayload(command.payload),
			}),
		)
	})
}

function getCommandPayload(payload: unknown): Record<string, unknown> {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {}
	}

	return { ...payload }
}

const rpcHandler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(error)
		}),
	],
})

app.get("/", (c) => {
	return c.text("Hello Hono!")
})

app.use("/rpc/*", corsMiddleware)

app.use("/rpc/*", async (c, next) => {
	const { matched, response } = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: await createRpcContext(c.req.raw),
	})

	if (matched) return c.newResponse(response.body, response)

	await next()
})

app.use("/api/*", corsMiddleware)

app.post("/api/create-test-user", async (c) => {
	const password = Math.random().toString(36).slice(-8)

	try {
		const user = await auth.api.signUpEmail({
			body: {
				name: `Test User ${Date.now()}`,
				email: `testuser-${Date.now()}@example.com`,
				password,
			},
		})

		return c.json({ ok: true, password, user })
	} catch (error) {
		console.error("Error creating test user:", error)
		return c.json({ ok: false, message: "Failed to create user", error }, 500)
	}
})

app.post("/api/delete-test-users", async (c) => {
	try {
		const deletedUsers = await db
			.delete(user)
			.where(like(user.email, "%@example.com"))
			.returning({ id: user.id })

		return c.json({ ok: true, deletedCount: deletedUsers.length })
	} catch (error) {
		console.error("Error deleting test users:", error)
		return c.json({ ok: false, message: "Failed to delete test users", error }, 500)
	}
})

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw)
})

serve(
	{
		fetch: app.fetch,
		port: env.PORT,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`)
	},
)
