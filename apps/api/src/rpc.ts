import { implement, ORPCError } from "@orpc/server"
import { routerContract } from "@wtrn/rpc-contract"
import { auth } from "./auth.ts"

export type AuthSession = typeof auth.$Infer.Session

export type RpcContext = {
	authSession: AuthSession | null
}

export async function createRpcContext(request: Request): Promise<RpcContext> {
	const authSession = await auth.api.getSession({
		headers: request.headers,
	})

	return { authSession }
}

export const os = implement(routerContract).$context<RpcContext>()

export const secured = os.use(({ context, next }) => {
	if (!context.authSession) {
		throw new ORPCError("UNAUTHORIZED")
	}

	return next({
		context: {
			authSession: context.authSession,
		},
	})
})
