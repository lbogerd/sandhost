import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@wtrn/components/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@wtrn/components/field"
import { Input } from "@wtrn/components/input"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { ComponentProps } from "react"
import { useState } from "react"
import { cn } from "tailwind-variants"
import { apiOrigin, orpc } from "../api.ts"

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
	const navigate = useNavigate()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [busyAction, setBusyAction] = useState<"sign-in" | "test-sign-in" | null>(null)

	const authStatusQuery = useQuery(
		orpc.authStatus.queryOptions({
			enabled: false,
			retry: false,
		}),
	)

	async function signIn(event: { preventDefault: () => void }) {
		event.preventDefault()
		setBusyAction("sign-in")
		setError(null)

		try {
			await signInWithEmailPassword(email, password)
			await authStatusQuery.refetch({ throwOnError: true })
			await navigate({ to: "/" })
		} catch (caughtError) {
			setError(getErrorMessage(caughtError, "Failed to sign in"))
		} finally {
			setBusyAction(null)
		}
	}

	async function createAndSignInTestUser() {
		setBusyAction("test-sign-in")
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
			await authStatusQuery.refetch({ throwOnError: true })
			await navigate({ to: "/" })
		} catch (caughtError) {
			setError(getErrorMessage(caughtError, "Failed to create and sign in test user"))
		} finally {
			setBusyAction(null)
		}
	}

	const isBusy = busyAction !== null

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>Enter your email below to login to your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={signIn}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									autoComplete="email"
									disabled={isBusy}
									id="email"
									name="email"
									onChange={(event) => setEmail(event.target.value)}
									placeholder="m@example.com"
									required
									type="email"
									value={email}
								/>
							</Field>
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<a
										href="#"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Forgot your password?
									</a>
								</div>
								<Input
									autoComplete="current-password"
									disabled={isBusy}
									id="password"
									name="password"
									onChange={(event) => setPassword(event.target.value)}
									required
									type="password"
									value={password}
								/>
							</Field>
							<Field>
								<Button disabled={isBusy} type="submit">
									{busyAction === "sign-in" ? "Logging in..." : "Login"}
								</Button>
								<Button
									disabled={isBusy}
									onClick={createAndSignInTestUser}
									variant="outline"
									type="button"
								>
									{busyAction === "test-sign-in" ? "Creating test user..." : "Login as test user"}
								</Button>
								{error ? <FieldError>{error}</FieldError> : null}
								<FieldDescription className="text-center">Use a local test user for quick checks.</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
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
