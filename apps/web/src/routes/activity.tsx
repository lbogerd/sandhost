import { createFileRoute } from "@tanstack/react-router"
import { DummyRoutePage } from "../components/dummy-route-page"

export const Route = createFileRoute("/activity")({
	component: Activity,
})

function Activity() {
	return (
		<DummyRoutePage
			title="Activity"
			description="Recent platform events and audit details will live here."
		/>
	)
}
