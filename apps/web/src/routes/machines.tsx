import { createFileRoute } from "@tanstack/react-router"
import { DummyRoutePage } from "../components/dummy-route-page"

export const Route = createFileRoute("/machines")({
	component: Machines,
})

function Machines() {
	return (
		<DummyRoutePage
			title="Machines"
			description="Machine inventory and host-level controls will live here."
		/>
	)
}
