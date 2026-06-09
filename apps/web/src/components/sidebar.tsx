import { Link, type LinkProps } from "@tanstack/react-router"
import { Button } from "@wtrn/components/button"
import { Box, ChevronsLeft, ChevronsRight, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { cn } from "tailwind-variants"

export type SidebarNavItem = {
	label: string
	icon: LucideIcon
	to: LinkProps["to"]
}

type SidebarProps = {
	navItems: readonly SidebarNavItem[]
}

export function Sidebar({ navItems }: SidebarProps) {
	const [isMinimized, setIsMinimized] = useState(false)

	return (
		<aside
			className={cn(
				"flex shrink-0 flex-col border-r bg-white transition-[width] duration-200 dark:bg-card",
				isMinimized ? "w-20" : "w-64",
			)}
		>
			<div
				className={cn("flex h-16 items-center gap-3 px-6", isMinimized && "justify-center px-0")}
			>
				<div className="flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 ring-1 ring-blue-100 dark:text-blue-300 dark:ring-blue-900/60">
					<Box className="h-5 w-5" />
				</div>
				{!isMinimized && (
					<span className="text-lg font-semibold tracking-tight">Sandbox Manager</span>
				)}
			</div>
			<nav className="flex-1 space-y-1 px-3 py-5">
				{navItems.map((item) => {
					const Icon = item.icon
					return (
						<Link
							key={item.label}
							to={item.to}
							activeOptions={{ exact: item.to === "/" }}
							aria-label={isMinimized ? item.label : undefined}
							title={isMinimized ? item.label : undefined}
							className={cn(
								"flex h-10 w-full items-center rounded-lg text-sm font-medium text-slate-600 transition-colors dark:text-muted-foreground",
								"hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-muted dark:hover:text-foreground",
								"[&.active]:bg-blue-50 [&.active]:text-blue-700 [&.active]:hover:bg-blue-50 dark:[&.active]:bg-blue-950/40 dark:[&.active]:text-blue-300 dark:[&.active]:hover:bg-blue-950/40",
								isMinimized ? "justify-center px-0" : "gap-3 px-3",
							)}
						>
							<Icon className="h-4 w-4" />
							{!isMinimized && item.label}
						</Link>
					)
				})}
			</nav>
			<div className={cn("p-4", isMinimized && "flex justify-center px-0")}>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-9 w-9"
					aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
					title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
					onClick={() => setIsMinimized((value) => !value)}
				>
					{isMinimized ? (
						<ChevronsRight className="h-4 w-4" />
					) : (
						<ChevronsLeft className="h-4 w-4" />
					)}
				</Button>
			</div>
		</aside>
	)
}
