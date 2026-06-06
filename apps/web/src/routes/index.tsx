import { createFileRoute } from "@tanstack/react-router"
import { apiClient, apiOrigin } from "../api.ts"
import type { FormEvent } from "react"
import { useState } from "react"

export const Route = createFileRoute("/")({
	component: Index,
})

function Index() {
	const [name, setName] = useState("oRPC")
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [authEmail, setAuthEmail] = useState<string | null>(null)
	const [authMessage, setAuthMessage] = useState<string | null>(null)
	const [authError, setAuthError] = useState<string | null>(null)
	const [authBusyAction, setAuthBusyAction] = useState<
		"create" | "protected" | "sign-out" | null
	>(null)

	async function callHelloProcedure(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await apiClient.hello({ name })
			setMessage(result.message)
		} catch (error) {
			setMessage(null)
			setError(error instanceof Error ? error.message : "Failed to call procedure")
		} finally {
			setIsLoading(false)
		}
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
			const result = await apiClient.authStatus()
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

	return (
		<div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-[1fr_1.15fr]">
			<div>
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
						disabled={isLoading}
						type="submit"
					>
						{isLoading ? "Calling..." : "Call hello"}
					</button>
				</form>

				<div className="mt-5 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
					<div className="font-medium text-neutral-700">Result</div>
					<div className="mt-2 text-neutral-950">
						{message ?? error ?? "No response yet."}
					</div>
				</div>
			</div>

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

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}
