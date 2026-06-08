import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { Activity, Box, FileText, Home, Server, Settings } from "lucide-react"
import { Sidebar, type SidebarNavItem } from "../components/sidebar"

const navItems = [
	{ label: "Overview", icon: Home, to: "/" },
	{ label: "Machines", icon: Server, to: "/machines" },
	{ label: "Sandboxes", icon: Box, to: "/sandboxes" },
	{ label: "Activity", icon: Activity, to: "/activity" },
	{ label: "Logs", icon: FileText, to: "/logs" },
	{ label: "Settings", icon: Settings, to: "/settings" },
] satisfies readonly SidebarNavItem[]

const RootLayout = () => {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const showAppShell = pathname !== "/login"

	return (
		<>
			{showAppShell ? (
				<div className="min-h-screen bg-slate-50 text-slate-950">
					<div className="flex min-h-screen">
						<Sidebar navItems={navItems} />
						<Outlet />
					</div>
				</div>
			) : (
				<Outlet />
			)}
		</>
	)
}

export const Route = createRootRoute({ component: RootLayout })
