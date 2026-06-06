import { implement, ORPCError } from "@orpc/server"
import { routerContract } from "@wtrn/rpc-contract"
import { auth } from "./auth.ts"

export type AuthSession = typeof auth.$Infer.Session

export type RpcContext = {
	authSession: AuthSession | null
	runner: RunnerAuth | null
}

export type RunnerAuth = {
	id: string
	keyId: string
}

export async function createRpcContext(request: Request): Promise<RpcContext> {
	const authSession = await auth.api.getSession({
		headers: request.headers,
	})
	const runner = await getRunnerAuth(request)

	return { authSession, runner }
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

export const runnerSecured = os.use(({ context, next }) => {
	if (!context.runner) {
		throw new ORPCError("UNAUTHORIZED")
	}

	return next({
		context: {
			runner: context.runner,
		},
	})
})

async function getRunnerAuth(request: Request): Promise<RunnerAuth | null> {
	const key = request.headers.get("x-runner-api-key")

	if (!key) return null

	const result = await auth.api.verifyApiKey({
		body: {
			configId: "runner",
			key,
			permissions: {
				runner: ["heartbeat"],
			},
		},
	})

	if (!result.valid || !result.key) return null

	const runnerId = getRunnerIdFromMetadata(result.key.metadata)
	if (!runnerId) return null

	return {
		id: runnerId,
		keyId: result.key.id,
	}
}

function getRunnerIdFromMetadata(metadata: unknown): string | null {
	const parsedMetadata = typeof metadata === "string" ? parseJsonObject(metadata) : metadata

	if (!parsedMetadata || typeof parsedMetadata !== "object") return null
	if (!("runnerId" in parsedMetadata)) return null

	const runnerId = parsedMetadata.runnerId
	return typeof runnerId === "string" && runnerId.length > 0 ? runnerId : null
}

function parseJsonObject(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return null
	}
}
