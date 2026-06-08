import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { orpc } from "../api.ts"

export const Route = createFileRoute("/")({
	component: Index,
})

function Index() {
	const navigate = useNavigate()
	const authStatusQuery = useQuery(
		orpc.authStatus.queryOptions({
			retry: false,
		}),
	)

	useEffect(() => {
		if (authStatusQuery.isError) {
			void navigate({ to: "/login" })
		}
	}, [authStatusQuery.isError, navigate])

	if (authStatusQuery.isLoading || authStatusQuery.isError) {
		return <main>Checking session...</main>
	}

	return (
		<main>
			<h1>Logged in</h1>
			<p>You are logged in as {authStatusQuery.data?.user.email}.</p>
		</main>
	)
}
