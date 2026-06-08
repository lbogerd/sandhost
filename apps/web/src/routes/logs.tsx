import { createFileRoute } from "@tanstack/react-router"
import { DummyRoutePage } from "../components/dummy-route-page"

export const Route = createFileRoute("/logs")({
	component: Logs,
})

function Logs() {
	return (
		<DummyRoutePage
			title="Logs"
			description="Searchable machine and sandbox logs will live here."
		/>
	)
}
