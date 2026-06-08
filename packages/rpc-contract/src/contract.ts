import { oc } from "@orpc/contract"
import z from "zod"

const helloWorldContract = oc
	.input(z.object({ name: z.string() }).optional().default({ name: "World" }))
	.output(z.object({ message: z.string() }))

const authStatusContract = oc.output(
	z.object({
		message: z.string(),
		user: z.object({
			id: z.string(),
			email: z.string(),
			name: z.string(),
		}),
	}),
)

const createRunnerApiKeyContract = oc
	.input(
		z.object({
			name: z.string().min(1).max(80),
			runnerId: z.string().min(1).max(120),
		}),
	)
	.output(
		z.object({
			apiKey: z.string(),
			name: z.string(),
			runnerId: z.string(),
		}),
	)

const listRunnersContract = oc.output(
	z.object({
		runners: z.array(
			z.object({
				hostname: z.string(),
				id: z.string(),
				lastSeenAt: z.iso.datetime(),
				latestHeartbeat: z
					.object({
						cpuUsagePercent: z.number(),
						memoryFreeBytes: z.number(),
						memoryTotalBytes: z.number(),
						reportedAt: z.iso.datetime(),
						runningSandboxCount: z.number(),
					})
					.nullable(),
				name: z.string().nullable(),
				online: z.boolean(),
				status: z.enum(["online", "offline"]),
			}),
		),
	}),
)

const startFakeSandboxContract = oc
	.input(
		z.object({
			runnerId: z.string().min(1),
		}),
	)
	.output(
		z.object({
			commandId: z.string(),
			runnerId: z.string(),
			sandboxId: z.string(),
		}),
	)

export const runnerCommandStatusSchema = z.enum([
	"pending",
	"claimed",
	"running",
	"succeeded",
	"failed",
])

export const localSandboxSchema = z.object({
	id: z.string(),
	startedAt: z.iso.datetime().nullable(),
	state: z.enum(["starting", "running", "stopping", "stopped", "failed"]),
})

export const runnerCommandSchema = z.discriminatedUnion("type", [
	z.object({
		id: z.string(),
		type: z.literal("startSandbox"),
		sandboxId: z.string(),
		image: z.string(),
		env: z.record(z.string(), z.string()).default({}),
	}),
	z.object({
		id: z.string(),
		type: z.literal("stopSandbox"),
		sandboxId: z.string(),
	}),
	z.object({
		id: z.string(),
		type: z.literal("killSandbox"),
		sandboxId: z.string(),
	}),
])

export const runnerCommandResultSchema = z.discriminatedUnion("status", [
	z.object({
		commandId: z.string().min(1),
		runnerId: z.string().min(1),
		status: z.literal("running"),
	}),
	z.object({
		commandId: z.string().min(1),
		runnerId: z.string().min(1),
		status: z.literal("succeeded"),
		sandbox: localSandboxSchema.optional(),
	}),
	z.object({
		commandId: z.string().min(1),
		runnerId: z.string().min(1),
		status: z.literal("failed"),
		error: z.string().min(1),
	}),
])

export type LocalSandbox = z.infer<typeof localSandboxSchema>
export type RunnerCommand = z.infer<typeof runnerCommandSchema>
export type RunnerCommandResult = z.infer<typeof runnerCommandResultSchema>

const runnerHeartbeatContract = oc
	.input(
		z.object({
			hostname: z.string().min(1),
			resources: z.object({
				cpuUsagePercent: z.number().min(0).max(100),
				memoryFreeBytes: z.number().nonnegative(),
				memoryTotalBytes: z.number().positive(),
			}),
			runnerId: z.string().min(1),
			sandboxes: z.array(localSandboxSchema),
			version: z.string().min(1),
		}),
	)
	.output(
		z.object({
			acceptedAt: z.iso.datetime(),
			commands: z.array(runnerCommandSchema),
		}),
	)

const runnerCommandResultContract = oc
	.input(runnerCommandResultSchema)
	.output(
		z.object({
			acceptedAt: z.iso.datetime(),
			commandId: z.string(),
			status: runnerCommandStatusSchema,
		}),
	)

export const routerContract = oc.router({
	authStatus: authStatusContract,
	createRunnerApiKey: createRunnerApiKeyContract,
	hello: helloWorldContract,
	listRunners: listRunnersContract,
	startFakeSandbox: startFakeSandboxContract,
	runner: oc.router({
		heartbeat: runnerHeartbeatContract,
		reportCommandResult: runnerCommandResultContract,
	}),
})
