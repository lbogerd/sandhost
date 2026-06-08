import { createFileRoute } from "@tanstack/react-router"
import { DummyRoutePage } from "../components/dummy-route-page"

export const Route = createFileRoute("/sandboxes")({
	component: Sandboxes,
})

function Sandboxes() {
	return (
		<DummyRoutePage
			title="Sandboxes"
			description="Sandbox sessions, ports, and runtime controls will live here."
		/>
	)
}
