import { oc } from "@orpc/contract"
import z from "zod"

const helloWorldContract = oc
	.input(z.object({ name: z.string() }).optional().default({ name: "World" }))
	.output(z.object({ message: z.string() }))

export const routerContract = oc.router({
	hello: helloWorldContract,
})
