import { createFileRoute } from "@tanstack/react-router"
import { DummyRoutePage } from "../components/dummy-route-page"

export const Route = createFileRoute("/settings")({
	component: Settings,
})

function Settings() {
	return (
		<DummyRoutePage
			title="Settings"
			description="Workspace preferences and operational defaults will live here."
		/>
	)
}
