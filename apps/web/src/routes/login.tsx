import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { orpc } from "../api.ts"
import { LoginForm } from "../components/login-form"

export const Route = createFileRoute("/login")({
	component: Login,
})

function Login() {
	const navigate = useNavigate()
	const authStatusQuery = useQuery(
		orpc.authStatus.queryOptions({
			retry: false,
		}),
	)

	useEffect(() => {
		if (authStatusQuery.isSuccess) {
			void navigate({ to: "/" })
		}
	}, [authStatusQuery.isSuccess, navigate])

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	)
}
