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

export const sandboxSchema = z.object({
	createdAt: z.iso.datetime(),
	env: z.record(z.string(), z.string()),
	finishedAt: z.iso.datetime().nullable(),
	id: z.string(),
	image: z.string(),
	name: z.string().nullable(),
	namespace: z.string(),
	podName: z.string(),
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

export const routerContract = oc.router({
	authStatus: authStatusContract,
	hello: helloWorldContract,
	sandbox: oc.router({
		create: createSandboxContract,
		get: getSandboxContract,
		kill: killSandboxContract,
		list: listSandboxesContract,
		stop: stopSandboxContract,
	}),
})
