import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { apiOrigin, orpc } from "../api.ts"
import type { FormEvent } from "react"
import { useState } from "react"

export const Route = createFileRoute("/")({
	component: Index,
})

function Index() {
	const [name, setName] = useState("oRPC")
	const [authEmail, setAuthEmail] = useState<string | null>(null)
	const [authMessage, setAuthMessage] = useState<string | null>(null)
	const [authError, setAuthError] = useState<string | null>(null)
	const [runnerName, setRunnerName] = useState("Local runner")
	const [runnerId, setRunnerId] = useState(createRunnerId())
	const [runnerKeyResult, setRunnerKeyResult] = useState<CreateRunnerKeyResult | null>(null)
	const [runnerKeyError, setRunnerKeyError] = useState<string | null>(null)
	const [runnerKeyCopied, setRunnerKeyCopied] = useState(false)
	const [authBusyAction, setAuthBusyAction] = useState<"create" | "protected" | "sign-out" | null>(
		null,
	)

	const helloMutation = useMutation(orpc.hello.mutationOptions())
	const createRunnerApiKeyMutation = useMutation(orpc.createRunnerApiKey.mutationOptions())
	const authStatusQuery = useQuery(
		orpc.authStatus.queryOptions({
			enabled: false,
			retry: false,
		}),
	)

	function callHelloProcedure(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		helloMutation.mutate({ name })
	}

	async function createAndSignInTestUser() {
		setAuthBusyAction("create")
		setAuthError(null)
		setAuthMessage(null)

		try {
			const createResponse = await fetch(`${apiOrigin}/api/create-test-user`, {
				credentials: "include",
				method: "POST",
			})

			if (!createResponse.ok) {
				throw new Error("Failed to create test user")
			}

			const createdUser = (await createResponse.json()) as CreateTestUserResponse
			const email = createdUser.user.user.email

			const signInResponse = await fetch(`${apiOrigin}/api/auth/sign-in/email`, {
				body: JSON.stringify({
					email,
					password: createdUser.password,
				}),
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			})

			if (!signInResponse.ok) {
				throw new Error("Failed to sign in test user")
			}

			setAuthEmail(email)
			setAuthMessage(`Signed in as ${email}`)
		} catch (error) {
			setAuthEmail(null)
			setAuthError(getErrorMessage(error, "Failed to create and sign in test user"))
		} finally {
			setAuthBusyAction(null)
		}
	}

	async function callProtectedProcedure() {
		setAuthBusyAction("protected")
		setAuthError(null)
		setAuthMessage(null)

		try {
			const { data: result } = await authStatusQuery.refetch({
				throwOnError: true,
			})

			if (!result) {
				throw new Error("Protected route returned no response")
			}

			setAuthEmail(result.user.email)
			setAuthMessage(result.message)
		} catch (error) {
			setAuthMessage(null)
			setAuthError(getErrorMessage(error, "Protected route rejected the request"))
		} finally {
			setAuthBusyAction(null)
		}
	}

	async function signOut() {
		setAuthBusyAction("sign-out")
		setAuthError(null)
		setAuthMessage(null)

		try {
			const response = await fetch(`${apiOrigin}/api/auth/sign-out`, {
				body: JSON.stringify({}),
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			})

			if (!response.ok) {
				throw new Error("Failed to sign out")
			}

			setAuthEmail(null)
			setAuthMessage("Signed out")
		} catch (error) {
			setAuthError(getErrorMessage(error, "Failed to sign out"))
		} finally {
			setAuthBusyAction(null)
		}
	}

	async function createRunnerApiKey(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setRunnerKeyError(null)
		setRunnerKeyResult(null)
		setRunnerKeyCopied(false)

		try {
			const result = await createRunnerApiKeyMutation.mutateAsync({
				name: runnerName,
				runnerId,
			})

			setRunnerKeyResult(result)
			setAuthMessage(`Created runner key for ${result.runnerId}`)
		} catch (error) {
			setRunnerKeyError(getErrorMessage(error, "Failed to create runner key"))
		}
	}

	function resetRunnerId() {
		setRunnerId(createRunnerId())
		setRunnerKeyCopied(false)
		setRunnerKeyResult(null)
		setRunnerKeyError(null)
	}

	async function copyRunnerEnv() {
		if (!runnerKeyResult) return

		await navigator.clipboard.writeText(getRunnerEnvBlock(runnerKeyResult))
		setRunnerKeyCopied(true)
	}

	return (
		<div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
			<section>
				<h1 className="text-2xl font-semibold">oRPC hello</h1>
				<p className="mt-1 text-sm text-neutral-600">
					Call the example procedure from the API server.
				</p>

				<form className="mt-5 flex flex-col gap-3" onSubmit={callHelloProcedure}>
					<label className="flex flex-col gap-1 text-sm font-medium">
						Name
						<input
							className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="World"
						/>
					</label>

					<button
						className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
						disabled={helloMutation.isPending}
						type="submit"
					>
						{helloMutation.isPending ? "Calling..." : "Call hello"}
					</button>
				</form>

				<div className="mt-5 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
					<div className="font-medium text-neutral-700">Result</div>
					<div className="mt-2 text-neutral-950">
						{helloMutation.error
							? `Error: ${getErrorMessage(helloMutation.error, "An unknown error occurred")}`
							: (JSON.stringify(helloMutation.data, null, 2) ?? "No response yet.")}
					</div>
				</div>
			</section>

			<section className="rounded-md border border-neutral-200 p-5">
				<div>
					<h2 className="text-xl font-semibold">Protected oRPC route</h2>
					<p className="mt-1 text-sm text-neutral-600">
						Call a route backed by the secured middleware.
					</p>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					<button
						className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
						disabled={authBusyAction !== null}
						onClick={createAndSignInTestUser}
						type="button"
					>
						{authBusyAction === "create" ? "Signing in..." : "Create test sign-in"}
					</button>
					<button
						className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
						disabled={authBusyAction !== null}
						onClick={callProtectedProcedure}
						type="button"
					>
						{authBusyAction === "protected" ? "Calling..." : "Call protected"}
					</button>
					<button
						className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
						disabled={authBusyAction !== null}
						onClick={signOut}
						type="button"
					>
						{authBusyAction === "sign-out" ? "Signing out..." : "Sign out"}
					</button>
				</div>

				<dl className="mt-5 grid gap-3 text-sm">
					<div className="rounded-md bg-neutral-50 p-3">
						<dt className="font-medium text-neutral-700">Current user</dt>
						<dd className="mt-1 text-neutral-950">{authEmail ?? "No signed-in user"}</dd>
					</div>
					<div className="rounded-md bg-neutral-50 p-3">
						<dt className="font-medium text-neutral-700">Protected result</dt>
						<dd className="mt-1 text-neutral-950">
							{authMessage ?? authError ?? "No response yet."}
						</dd>
					</div>
				</dl>
			</section>

			<section className="rounded-md border border-neutral-200 p-5 lg:col-span-2">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h2 className="text-xl font-semibold">Runner key</h2>
						<p className="mt-1 text-sm text-neutral-600">
							Create the API key used by the runner daemon.
						</p>
					</div>
					<button
						className="w-fit rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
						disabled={createRunnerApiKeyMutation.isPending}
						onClick={resetRunnerId}
						type="button"
					>
						New ID
					</button>
				</div>

				<form className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={createRunnerApiKey}>
					<label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
						Name
						<input
							className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900"
							value={runnerName}
							onChange={(event) => setRunnerName(event.target.value)}
							placeholder="Local runner"
						/>
					</label>

					<label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
						Runner ID
						<input
							className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm font-normal outline-none focus:border-neutral-900"
							value={runnerId}
							onChange={(event) => setRunnerId(event.target.value)}
							placeholder="runner-local"
						/>
					</label>

					<button
						className="self-end rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
						disabled={
							createRunnerApiKeyMutation.isPending ||
							runnerName.length === 0 ||
							runnerId.length === 0
						}
						type="submit"
					>
						{createRunnerApiKeyMutation.isPending ? "Creating..." : "Create key"}
					</button>
				</form>

				<div className="mt-5 rounded-md bg-neutral-50 p-4 text-sm">
					<div className="font-medium text-neutral-700">Runner environment</div>
					{runnerKeyResult ? (
						<>
							<pre className="mt-3 overflow-x-auto rounded-md bg-neutral-950 p-4 text-xs leading-6 text-neutral-50">
								{getRunnerEnvBlock(runnerKeyResult)}
							</pre>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<button
									className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
									onClick={copyRunnerEnv}
									type="button"
								>
									{runnerKeyCopied ? "Copied" : "Copy env"}
								</button>
								<span className="text-neutral-600">
									The key is only shown immediately after creation.
								</span>
							</div>
						</>
					) : (
						<div className="mt-2 text-neutral-950">
							{runnerKeyError ?? "Sign in, then create a runner key."}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}

type CreateTestUserResponse = {
	password: string
	user: {
		user: {
			email: string
		}
	}
}

type CreateRunnerKeyResult = {
	apiKey: string
	name: string
	runnerId: string
}

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}

function createRunnerId() {
	if ("crypto" in globalThis && "randomUUID" in crypto) {
		return `runner-${crypto.randomUUID().slice(0, 8)}`
	}

	return `runner-${Math.random().toString(36).slice(2, 10)}`
}

function getRunnerEnvBlock(result: CreateRunnerKeyResult) {
	return [
		`RUNNER_ID=${result.runnerId}`,
		`RUNNER_API_KEY=${result.apiKey}`,
		`API_RPC_URL=${apiOrigin}/rpc`,
		"HEARTBEAT_INTERVAL_MS=5000",
	].join("\n")
}
