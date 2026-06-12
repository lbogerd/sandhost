import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { Activity, FileText, Home, Settings } from "lucide-react"
import { Sidebar, type SidebarNavItem } from "../components/sidebar"
import { Topbar } from "../components/topbar"

const navItems = [
	{ label: "Overview", icon: Home, to: "/" },
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
				<div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-background dark:text-foreground">
					<div className="flex min-h-screen">
						<Sidebar navItems={navItems} />
						<div className="flex min-w-0 flex-1 flex-col">
							<Topbar />
							<Outlet />
						</div>
					</div>
				</div>
			) : (
				<Outlet />
			)}
		</>
	)
}

export const Route = createRootRoute({ component: RootLayout })
