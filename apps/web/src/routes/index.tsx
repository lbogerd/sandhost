import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type { FormEvent } from "react"
import { useState } from "react"
import { apiOrigin, orpc } from "../api.ts"
import { AccordionTest } from "../components/accordion-test.tsx"

export const Route = createFileRoute("/")({
	component: Index,
})

function Index() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [busyAction, setBusyAction] = useState<"sign-in" | "test-sign-in" | "sign-out" | null>(null)

	const authStatusQuery = useQuery(
		orpc.authStatus.queryOptions({
			retry: false,
		}),
	)

	const user = authStatusQuery.data?.user ?? null

	async function signIn(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setBusyAction("sign-in")
		setMessage(null)
		setError(null)

		try {
			await signInWithEmailPassword(email, password)
			const { data } = await authStatusQuery.refetch({ throwOnError: true })

			setMessage(data ? `Signed in as ${data.user.email}` : "Signed in")
		} catch (caughtError) {
			setError(getErrorMessage(caughtError, "Failed to sign in"))
		} finally {
			setBusyAction(null)
		}
	}

	async function createAndSignInTestUser() {
		setBusyAction("test-sign-in")
		setMessage(null)
		setError(null)

		try {
			const response = await fetch(`${apiOrigin}/api/create-test-user`, {
				credentials: "include",
				method: "POST",
			})

			if (!response.ok) {
				throw new Error("Failed to create test user")
			}

			const createdUser = (await response.json()) as CreateTestUserResponse
			const testEmail = createdUser.user.user.email

			await signInWithEmailPassword(testEmail, createdUser.password)
			const { data } = await authStatusQuery.refetch({ throwOnError: true })

			setEmail(testEmail)
			setPassword(createdUser.password)
			setMessage(data ? `Signed in as ${data.user.email}` : "Signed in")
		} catch (caughtError) {
			setError(getErrorMessage(caughtError, "Failed to create and sign in test user"))
		} finally {
			setBusyAction(null)
		}
	}

	async function signOut() {
		setBusyAction("sign-out")
		setMessage(null)
		setError(null)

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

			await authStatusQuery.refetch()
			setMessage("Signed out")
		} catch (caughtError) {
			setError(getErrorMessage(caughtError, "Failed to sign out"))
		} finally {
			setBusyAction(null)
		}
	}

	return (
		<main>
			<h1>Sign in</h1>

			<section>
				<h2 className="bg-primary text-secondary">Session</h2>
				{authStatusQuery.isLoading ? <p>Checking session...</p> : null}
				{user ? (
					<div>
						<p>Signed in as {user.email}</p>
						<p>User ID: {user.id}</p>
						<p>Name: {user.name}</p>
						<button disabled={busyAction !== null} onClick={signOut} type="button">
							{busyAction === "sign-out" ? "Signing out..." : "Sign out"}
						</button>
					</div>
				) : (
					<p>No signed-in user.</p>
				)}
			</section>

			<section>
				<h2>Email sign-in</h2>
				<form onSubmit={signIn}>
					<label>
						Email
						<input
							autoComplete="email"
							disabled={busyAction !== null}
							name="email"
							onChange={(event) => setEmail(event.target.value)}
							required
							type="email"
							value={email}
						/>
					</label>

					<label>
						Password
						<input
							autoComplete="current-password"
							disabled={busyAction !== null}
							name="password"
							onChange={(event) => setPassword(event.target.value)}
							required
							type="password"
							value={password}
						/>
					</label>

					<button disabled={busyAction !== null} type="submit">
						{busyAction === "sign-in" ? "Signing in..." : "Sign in"}
					</button>
				</form>
			</section>

			<section>
				<h2>Local test user</h2>
				<button disabled={busyAction !== null} onClick={createAndSignInTestUser} type="button">
					{busyAction === "test-sign-in" ? "Creating test user..." : "Create test user and sign in"}
				</button>
			</section>

			<AccordionTest />

			{message ? <p>{message}</p> : null}
			{error ? <p role="alert">{error}</p> : null}
		</main>
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

async function signInWithEmailPassword(email: string, password: string) {
	const response = await fetch(`${apiOrigin}/api/auth/sign-in/email`, {
		body: JSON.stringify({
			email,
			password,
		}),
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		method: "POST",
	})

	if (!response.ok) {
		const message = await readErrorMessage(response)
		throw new Error(message ?? "Failed to sign in")
	}
}

async function readErrorMessage(response: Response) {
	try {
		const body = (await response.json()) as { message?: unknown }
		return typeof body.message === "string" && body.message.length > 0 ? body.message : null
	} catch {
		return null
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}
