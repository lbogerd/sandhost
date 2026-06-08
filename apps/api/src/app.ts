import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { auth } from "./auth.ts"
import { env } from "./env.ts"
import { cors } from "hono/cors"
import { db } from "@wtrn/db"
import {
	and,
	asc,
	desc,
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

const RUNNER_ONLINE_WINDOW_MS = 30_000

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
	listRunners: secured.listRunners.handler(async () => {
		const runners = await db.select().from(runner).orderBy(asc(runner.id))
		const heartbeats = await db
			.select()
			.from(runnerHeartbeat)
			.orderBy(desc(runnerHeartbeat.reportedAt))
		const latestHeartbeats = new Map<string, (typeof heartbeats)[number]>()

		for (const heartbeat of heartbeats) {
			if (!latestHeartbeats.has(heartbeat.runnerId)) {
				latestHeartbeats.set(heartbeat.runnerId, heartbeat)
			}
		}

		return {
			runners: runners.map((currentRunner) => {
				const latestHeartbeat = latestHeartbeats.get(currentRunner.id) ?? null
				const online = Date.now() - currentRunner.lastSeenAt.getTime() <= RUNNER_ONLINE_WINDOW_MS

				return {
					hostname: currentRunner.hostname,
					id: currentRunner.id,
					lastSeenAt: currentRunner.lastSeenAt.toISOString(),
					latestHeartbeat: latestHeartbeat
						? {
								cpuUsagePercent: latestHeartbeat.cpuUsagePercent,
								memoryFreeBytes: latestHeartbeat.memoryFreeBytes,
								memoryTotalBytes: latestHeartbeat.memoryTotalBytes,
								reportedAt: latestHeartbeat.reportedAt.toISOString(),
								runningSandboxCount: latestHeartbeat.runningSandboxCount,
							}
						: null,
					name: currentRunner.name,
					online,
					status: online ? "online" : "offline",
				}
			}),
		}
	}),
	startFakeSandbox: secured.startFakeSandbox.handler(async ({ input }) => {
		const selectedRunner = await db
			.select()
			.from(runner)
			.where(eq(runner.id, input.runnerId))
			.limit(1)

		if (!selectedRunner[0]) {
			throw new ORPCError("NOT_FOUND", {
				message: "Runner not found",
			})
		}

		const online = Date.now() - selectedRunner[0].lastSeenAt.getTime() <= RUNNER_ONLINE_WINDOW_MS

		if (!online) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Runner is offline",
			})
		}

		const commandId = randomUUID()
		const sandboxId = `sandbox-${randomUUID().slice(0, 8)}`

		await db.insert(runnerCommand).values({
			id: commandId,
			payload: {
				env: {},
				image: "fake://sandbox",
				sandboxId,
			},
			runnerId: input.runnerId,
			status: "pending",
			type: "startSandbox",
		})

		return {
			commandId,
			runnerId: input.runnerId,
			sandboxId,
		}
	}),
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
		reportCommandResult: runnerSecured.runner.reportCommandResult.handler(
			async ({ context, input }) => {
				if (context.runner.id !== input.runnerId) {
					throw new ORPCError("UNAUTHORIZED", {
						message: "Runner ID does not match API key metadata",
					})
				}

				const acceptedAt = new Date()

				return db.transaction(async (tx) => {
					const selectedCommands = await tx
						.select()
						.from(runnerCommand)
						.where(eq(runnerCommand.id, input.commandId))
						.limit(1)
					const command = selectedCommands[0]

					if (!command) {
						throw new ORPCError("NOT_FOUND", {
							message: "Runner command not found",
						})
					}

					if (command.runnerId !== input.runnerId) {
						throw new ORPCError("UNAUTHORIZED", {
							message: "Runner command belongs to a different runner",
						})
					}

					switch (input.status) {
						case "running":
							await tx
								.update(runnerCommand)
								.set({
									error: null,
									startedAt: command.startedAt ?? acceptedAt,
									status: "running",
								})
								.where(eq(runnerCommand.id, input.commandId))
							break
						case "succeeded":
							await tx
								.update(runnerCommand)
								.set({
									error: null,
									finishedAt: acceptedAt,
									status: "succeeded",
								})
								.where(eq(runnerCommand.id, input.commandId))
							break
						case "failed":
							await tx
								.update(runnerCommand)
								.set({
									error: input.error,
									finishedAt: acceptedAt,
									status: "failed",
								})
								.where(eq(runnerCommand.id, input.commandId))
							break
					}

					return {
						acceptedAt: acceptedAt.toISOString(),
						commandId: input.commandId,
						status: input.status,
					}
				})
			},
		),
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
