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

export const sandboxStatusSchema = z.enum(["starting", "running", "stopping", "stopped", "failed"])

// Kubernetes resource quantity, e.g. "250m", "0.5", "256Mi", "1Gi".
const resourceQuantitySchema = z
	.string()
	.regex(/^\d+(\.\d+)?(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)?$/, "Invalid resource quantity")

export const sandboxResourcesSchema = z.object({
	cpuLimit: resourceQuantitySchema.optional(),
	cpuRequest: resourceQuantitySchema.optional(),
	memoryLimit: resourceQuantitySchema.optional(),
	memoryRequest: resourceQuantitySchema.optional(),
})

export type SandboxResources = z.infer<typeof sandboxResourcesSchema>

export const sandboxSchema = z.object({
	createdAt: z.iso.datetime(),
	env: z.record(z.string(), z.string()),
	finishedAt: z.iso.datetime().nullable(),
	id: z.string(),
	image: z.string(),
	name: z.string().nullable(),
	namespace: z.string(),
	podName: z.string(),
	resources: sandboxResourcesSchema.nullable(),
	startedAt: z.iso.datetime().nullable(),
	status: sandboxStatusSchema,
	statusReason: z.string().nullable(),
})

export type SandboxStatus = z.infer<typeof sandboxStatusSchema>
export type Sandbox = z.infer<typeof sandboxSchema>

const envKeySchema = z
	.string()
	.regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Invalid environment variable name")

const createSandboxContract = oc
	.input(
		z.object({
			command: z.array(z.string().min(1)).optional(),
			env: z.record(envKeySchema, z.string()).default({}),
			image: z.string().min(1).optional(),
			name: z.string().min(1).max(63).optional(),
			resources: sandboxResourcesSchema.optional(),
		}),
	)
	.output(sandboxSchema)

const getSandboxContract = oc.input(z.object({ id: z.string().min(1) })).output(sandboxSchema)

const stopSandboxContract = oc.input(z.object({ id: z.string().min(1) })).output(sandboxSchema)

const killSandboxContract = oc.input(z.object({ id: z.string().min(1) })).output(sandboxSchema)

const listSandboxesContract = oc.output(
	z.object({
		sandboxes: z.array(sandboxSchema),
	}),
)

const sandboxLogsContract = oc
	.input(
		z.object({
			id: z.string().min(1),
			tailLines: z.number().int().min(1).max(1000).default(200),
		}),
	)
	.output(
		z.object({
			available: z.boolean(),
			logs: z.string(),
		}),
	)

const sandboxExecContract = oc
	.input(
		z.object({
			command: z.array(z.string().min(1)).min(1),
			id: z.string().min(1),
		}),
	)
	.output(
		z.object({
			exitCode: z.number().nullable(),
			stderr: z.string(),
			stdout: z.string(),
		}),
	)

export const routerContract = oc.router({
	authStatus: authStatusContract,
	hello: helloWorldContract,
	sandbox: oc.router({
		create: createSandboxContract,
		exec: sandboxExecContract,
		get: getSandboxContract,
		kill: killSandboxContract,
		list: listSandboxesContract,
		logs: sandboxLogsContract,
		stop: stopSandboxContract,
	}),
})
