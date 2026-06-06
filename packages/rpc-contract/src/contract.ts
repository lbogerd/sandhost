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

export const routerContract = oc.router({
	authStatus: authStatusContract,
	hello: helloWorldContract,
})
