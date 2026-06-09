import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { orpc } from "../api.ts"
import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@wtrn/components/card"
import {
	Activity,
	Box,
	FileText,
	LayoutDashboard,
	Square,
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	CornerDownRight,
	MoreVertical,
	ChevronLeft,
	Plus,
	RefreshCw,
	Terminal,
} from "lucide-react"
import { cn } from "tailwind-variants"
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@wtrn/components/table"

type Status = "healthy" | "running" | "warning" | "critical" | "stopped" | "starting" | "error"
type RowType = "Machine" | "Sandbox"

type OverviewRow = {
	id: string
	name: string
	type: RowType
	status: Status
	details: string
	usageOrPort: string
	cpu: number
	memoryLabel: string
	memoryPercent: number
	regionIp: string[]
	expanded?: boolean
	child?: boolean
}

const rows: OverviewRow[] = [
	{
		id: "dev-server-01",
		name: "dev-server-01",
		type: "Machine",
		status: "healthy",
		details: "Ubuntu 22.04 • 16 vCPU • 32 GB",
		usageOrPort: "6 / 8",
		cpu: 32,
		memoryLabel: "48%",
		memoryPercent: 48,
		regionIp: ["us-east-1", "10.0.1.10"],
		expanded: true,
	},
	{
		id: "api-sandbox-01",
		name: "api-sandbox-01",
		type: "Sandbox",
		status: "running",
		details: "sbx_8f3a2c1e",
		usageOrPort: "3001",
		cpu: 12,
		memoryLabel: "256 MB",
		memoryPercent: 12,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "web-sandbox-01",
		name: "web-sandbox-01",
		type: "Sandbox",
		status: "running",
		details: "sbx_3b7d9a21",
		usageOrPort: "3000",
		cpu: 18,
		memoryLabel: "512 MB",
		memoryPercent: 24,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "worker-sandbox-01",
		name: "worker-sandbox-01",
		type: "Sandbox",
		status: "running",
		details: "sbx_6c4e7b91",
		usageOrPort: "3002",
		cpu: 8,
		memoryLabel: "128 MB",
		memoryPercent: 6,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "db-sandbox-01",
		name: "db-sandbox-01",
		type: "Sandbox",
		status: "stopped",
		details: "sbx_a1d48c62",
		usageOrPort: "5432",
		cpu: 0,
		memoryLabel: "0 MB",
		memoryPercent: 0,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "cache-sandbox-01",
		name: "cache-sandbox-01",
		type: "Sandbox",
		status: "starting",
		details: "sbx_91e2b3f4",
		usageOrPort: "6379",
		cpu: 5,
		memoryLabel: "64 MB",
		memoryPercent: 3,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "test-sandbox-01",
		name: "test-sandbox-01",
		type: "Sandbox",
		status: "error",
		details: "sbx_5d6f7a88",
		usageOrPort: "3003",
		cpu: 0,
		memoryLabel: "0 MB",
		memoryPercent: 0,
		regionIp: ["—"],
		child: true,
	},
	{
		id: "staging-server-02",
		name: "staging-server-02",
		type: "Machine",
		status: "healthy",
		details: "Ubuntu 22.04 • 8 vCPU • 16 GB",
		usageOrPort: "4 / 6",
		cpu: 41,
		memoryLabel: "63%",
		memoryPercent: 63,
		regionIp: ["us-west-2", "10.0.2.15"],
	},
	{
		id: "prod-server-01",
		name: "prod-server-01",
		type: "Machine",
		status: "warning",
		details: "Ubuntu 22.04 • 16 vCPU • 64 GB",
		usageOrPort: "7 / 10",
		cpu: 72,
		memoryLabel: "81%",
		memoryPercent: 81,
		regionIp: ["eu-central-1", "10.0.3.20"],
	},
	{
		id: "ops-server-01",
		name: "ops-server-01",
		type: "Machine",
		status: "critical",
		details: "Ubuntu 22.04 • 4 vCPU • 8 GB",
		usageOrPort: "1 / 4",
		cpu: 91,
		memoryLabel: "90%",
		memoryPercent: 90,
		regionIp: ["ap-southeast-1", "10.0.4.25"],
	},
]

const activityItems = [
	{
		icon: LayoutDashboard,
		tone: "green",
		title: "Started sandbox api-sandbox-01",
		detail: "on dev-server-01",
		time: "2m ago",
	},
	{
		icon: AlertTriangle,
		tone: "amber",
		title: "High memory usage on",
		detail: "prod-server-01",
		time: "8m ago",
	},
	{
		icon: Box,
		tone: "blue",
		title: "Created sandbox test-sandbox-02",
		detail: "on staging-server-02",
		time: "15m ago",
	},
	{
		icon: Square,
		tone: "gray",
		title: "Stopped sandbox cache-sandbox-01",
		detail: "on dev-server-01",
		time: "45m ago",
	},
	{
		icon: Activity,
		tone: "green",
		title: "Machine dev-server-01 is healthy",
		detail: "",
		time: "1h ago",
	},
]

const alertItems = [
	{ tone: "red", title: "High CPU usage on ops-server-01", detail: "CPU at 91%", time: "2m ago" },
	{
		tone: "amber",
		title: "High memory usage on prod-server-01",
		detail: "Memory at 81%",
		time: "8m ago",
	},
	{ tone: "red", title: "Sandbox test-sandbox-01 error", detail: "Exit code 1", time: "25m ago" },
]

const dotClassByStatus: Record<Status, string> = {
	healthy: "bg-emerald-500",
	running: "bg-emerald-500",
	warning: "bg-amber-500",
	critical: "bg-red-500",
	stopped: "bg-slate-400",
	starting: "bg-amber-500",
	error: "bg-red-500",
}

const toneClasses = {
	blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
	green: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
	gray: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
	red: "bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
	amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
} as const

export const Route = createFileRoute("/")({
	component: Index,
})

function StatusDot({ status }: { status: Status }) {
	return (
		<span
			aria-label={status}
			className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassByStatus[status])}
			title={status}
		/>
	)
}

function UsageBar({ value, status }: { value: number; status?: Status }) {
	return (
		<div className="mt-1 h-1.5 w-16 rounded-full bg-slate-100 dark:bg-muted">
			<div
				className={cn(
					"h-1.5 rounded-full",
					value >= 85
						? "bg-red-500"
						: value >= 60
							? "bg-amber-500"
							: status === "stopped" || status === "error"
								? "bg-slate-300 dark:bg-slate-600"
								: "bg-emerald-500",
				)}
				style={{ width: `${Math.min(value, 100)}%` }}
			/>
		</div>
	)
}

function OverviewTable() {
	return (
		<Card className="overflow-hidden gap-0">
			<CardHeader className="border-b px-5 py-4">
				<CardTitle className="text-base">Machines &amp; Sandboxes</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<colgroup>
						<col className="w-[25%]" />
						<col className="w-[9%]" />
						<col className="w-[19%]" />
						<col className="w-[10%]" />
						<col className="w-[10%]" />
						<col className="w-[10%]" />
						<col className="w-[11%]" />
						<col className="w-[6%]" />
					</colgroup>
					<TableHeader>
						<TableRow className="bg-slate-50/80 dark:bg-muted/40">
							<TableHead className="pl-5">Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Details</TableHead>
							<TableHead>Usage / Port</TableHead>
							<TableHead>CPU</TableHead>
							<TableHead>Memory</TableHead>
							<TableHead>Region / IP</TableHead>
							<TableHead className="pr-5 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow
								key={row.id}
								className={cn(
									"h-14",
									row.child && "bg-slate-50/35 dark:bg-muted/20",
									row.type === "Machine" && "font-medium",
								)}
							>
								<TableCell className="pl-5">
									<div className="flex items-center gap-2">
										<StatusDot status={row.status} />
										{row.type === "Machine" ? (
											row.expanded ? (
												<ChevronDown className="h-4 w-4 text-slate-500 dark:text-muted-foreground" />
											) : (
												<ChevronRight className="h-4 w-4 text-slate-500 dark:text-muted-foreground" />
											)
										) : (
											<CornerDownRight className="h-4 w-4 text-slate-300 dark:text-muted-foreground/60" />
										)}
										<span className={cn(row.child && "font-normal text-slate-700 dark:text-foreground/80")}>
											{row.name}
										</span>
									</div>
								</TableCell>
								<TableCell className="text-xs text-slate-500 dark:text-muted-foreground">{row.type}</TableCell>
								<TableCell className="text-xs text-slate-600 dark:text-muted-foreground">{row.details}</TableCell>
								<TableCell className="text-sm text-slate-700 dark:text-foreground/80">{row.usageOrPort}</TableCell>
								<TableCell>
									<div className="text-xs text-slate-700 dark:text-foreground/80">{row.cpu}%</div>
									<UsageBar value={row.cpu} status={row.status} />
								</TableCell>
								<TableCell>
									<div className="text-xs text-slate-700 dark:text-foreground/80">{row.memoryLabel}</div>
									<UsageBar value={row.memoryPercent} status={row.status} />
								</TableCell>
								<TableCell className="text-xs text-slate-600 dark:text-muted-foreground">
									{row.regionIp.map((line) => (
										<div key={line}>{line}</div>
									))}
								</TableCell>
								<TableCell className="pr-5 text-right">
									<div className="flex items-center justify-end gap-2">
										{row.type === "Machine" && (
											<Button variant="outline" size="sm" className="h-8 px-3 text-xs">
												View Details
											</Button>
										)}
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											aria-label={`More actions for ${row.name}`}
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<div className="flex items-center justify-between border-t px-5 py-4 text-sm text-slate-500 dark:text-muted-foreground">
					<span>Showing 1 to 4 of 12 machines</span>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="icon" className="h-8 w-8">
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button size="icon" className="h-8 w-8">
							1
						</Button>
						<Button variant="outline" size="icon" className="h-8 w-8">
							2
						</Button>
						<Button variant="outline" size="icon" className="h-8 w-8">
							3
						</Button>
						<Button variant="outline" size="icon" className="h-8 w-8">
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function RightRail() {
	return (
		<aside className="w-80 shrink-0 space-y-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between px-4 py-4">
					<CardTitle className="text-base">Recent Activity</CardTitle>
					<Button variant="link" className="h-auto p-0 text-sm">
						View all
					</Button>
				</CardHeader>
				<CardContent className="space-y-4 px-4 pt-0">
					{activityItems.map((item) => {
						const Icon = item.icon
						return (
							<div
								key={`${item.title}-${item.time}`}
								className="grid grid-cols-[24px_1fr_auto] gap-3 text-sm"
							>
								<div
									className={cn(
										"mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1",
										toneClasses[item.tone as keyof typeof toneClasses],
									)}
								>
									<Icon className="h-3.5 w-3.5" children={undefined} />
								</div>
								<div>
									<p className="font-medium leading-5 text-slate-800 dark:text-foreground">{item.title}</p>
									{item.detail && <p className="leading-5 text-slate-600 dark:text-muted-foreground">{item.detail}</p>}
								</div>
								<span className="text-xs text-slate-500 dark:text-muted-foreground">{item.time}</span>
							</div>
						)
					})}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between px-4 py-4">
					<CardTitle className="text-base">Alerts</CardTitle>
					<Button variant="link" className="h-auto p-0 text-sm">
						View all
					</Button>
				</CardHeader>
				<CardContent className="space-y-4 px-4 pt-0">
					{alertItems.map((item) => (
						<div
							key={`${item.title}-${item.time}`}
							className="grid grid-cols-[24px_1fr_auto] gap-3 text-sm"
						>
							<div
								className={cn(
									"mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1",
									toneClasses[item.tone as keyof typeof toneClasses],
								)}
							>
								<AlertTriangle className="h-3.5 w-3.5" />
							</div>
							<div>
								<p className="font-medium leading-5 text-slate-800 dark:text-foreground">{item.title}</p>
								<p className="leading-5 text-slate-600 dark:text-muted-foreground">{item.detail}</p>
							</div>
							<span className="text-xs text-slate-500 dark:text-muted-foreground">{item.time}</span>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="px-4 py-4">
					<CardTitle className="text-base">Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 px-4 pt-0">
					<Button className="h-11 w-full justify-start gap-3">
						<Plus className="h-4 w-4" />
						Create Sandbox
					</Button>
					<Button variant="outline" className="h-11 w-full justify-start gap-3">
						<RefreshCw className="h-4 w-4" />
						Restart All Sandboxes
					</Button>
					<Button variant="outline" className="h-11 w-full justify-start gap-3">
						<FileText className="h-4 w-4" />
						View Logs
					</Button>
					<Button variant="outline" className="h-11 w-full justify-start gap-3">
						<Terminal className="h-4 w-4" />
						Open Terminal
					</Button>
				</CardContent>
			</Card>
		</aside>
	)
}

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
		<main className="flex min-w-0 flex-1 flex-col">
			<div className="flex flex-1 gap-4 p-4">
				<section className="min-w-0 flex-1 space-y-4">
					<OverviewTable />
				</section>
				<RightRail />
			</div>
		</main>
	)
}
