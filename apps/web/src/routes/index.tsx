import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { Sandbox, SandboxStatus } from "@wtrn/rpc-contract"
import { useEffect } from "react"
import { orpc } from "../api.ts"
import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@wtrn/components/card"
import { Activity, AlertTriangle, Box, CircleStop, Plus, RefreshCw, Square } from "lucide-react"
import { cn } from "tailwind-variants"
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@wtrn/components/table"
import { formatAge } from "../logic/formatAge"

export const Route = createFileRoute("/")({
	component: Index,
})

const dotClassByStatus: Record<SandboxStatus, string> = {
	starting: "bg-amber-500",
	running: "bg-emerald-500",
	stopping: "bg-amber-500",
	stopped: "bg-slate-400",
	failed: "bg-red-500",
}

function StatusBadge({ sandbox }: { sandbox: Sandbox }) {
	return (
		<div className="flex items-center gap-2">
			<span
				aria-label={sandbox.status}
				className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassByStatus[sandbox.status])}
				title={sandbox.statusReason ?? sandbox.status}
			/>
			<span className="text-sm capitalize">{sandbox.status}</span>
		</div>
	)
}

function sandboxLabel(sandbox: Sandbox) {
	return sandbox.name ?? sandbox.id.slice(0, 8)
}

function StatCards({ sandboxes }: { sandboxes: Sandbox[] }) {
	const count = (statuses: SandboxStatus[]) =>
		sandboxes.filter((sandbox) => statuses.includes(sandbox.status)).length

	const stats = [
		{ label: "Running", value: count(["running"]), dot: "bg-emerald-500" },
		{ label: "Starting / Stopping", value: count(["starting", "stopping"]), dot: "bg-amber-500" },
		{ label: "Stopped", value: count(["stopped"]), dot: "bg-slate-400" },
		{ label: "Failed", value: count(["failed"]), dot: "bg-red-500" },
	]

	return (
		<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
			{stats.map((stat) => (
				<Card key={stat.label} className="gap-1 py-4">
					<CardHeader className="px-4 py-0">
						<CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-muted-foreground">
							<span className={cn("h-2 w-2 rounded-full", stat.dot)} />
							{stat.label}
						</CardTitle>
					</CardHeader>
					<CardContent className="px-4 py-0">
						<p className="text-2xl font-semibold">{stat.value}</p>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

function SandboxOverviewTable({
	sandboxes,
	isLoading,
}: {
	sandboxes: Sandbox[]
	isLoading: boolean
}) {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const invalidate = () => void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
	const stopMutation = useMutation(orpc.sandbox.stop.mutationOptions({ onSuccess: invalidate }))
	const killMutation = useMutation(orpc.sandbox.kill.mutationOptions({ onSuccess: invalidate }))

	return (
		<Card className="gap-0 overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
				<CardTitle className="text-base">Agent Sandboxes</CardTitle>
				<Button
					variant="link"
					className="h-auto p-0 text-sm"
					onClick={() => void navigate({ to: "/sandboxes" })}
				>
					Manage
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				{sandboxes.length === 0 ? (
					<p className="px-5 py-8 text-sm text-slate-500 dark:text-muted-foreground">
						{isLoading
							? "Loading sandboxes..."
							: "No sandboxes yet. Create one to give an agent an isolated pod in the cluster."}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="bg-slate-50/80 dark:bg-muted/40">
								<TableHead className="pl-5">Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Image</TableHead>
								<TableHead>Pod</TableHead>
								<TableHead>Namespace</TableHead>
								<TableHead>Age</TableHead>
								<TableHead className="pr-5 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sandboxes.map((sandbox) => {
								const isTerminal = sandbox.status === "stopped" || sandbox.status === "failed"
								const canStop = sandbox.status === "starting" || sandbox.status === "running"

								return (
									<TableRow key={sandbox.id} className="h-14">
										<TableCell className="pl-5 font-medium">{sandboxLabel(sandbox)}</TableCell>
										<TableCell>
											<StatusBadge sandbox={sandbox} />
										</TableCell>
										<TableCell className="text-xs text-slate-600 dark:text-muted-foreground">
											{sandbox.image}
										</TableCell>
										<TableCell className="font-mono text-xs text-slate-600 dark:text-muted-foreground">
											{sandbox.podName}
										</TableCell>
										<TableCell className="text-xs text-slate-600 dark:text-muted-foreground">
											{sandbox.namespace}
										</TableCell>
										<TableCell className="text-sm text-slate-700 dark:text-foreground/80">
											{formatAge(sandbox.createdAt)}
										</TableCell>
										<TableCell className="pr-5 text-right">
											<div className="flex items-center justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													className="h-8 px-3 text-xs"
													disabled={!canStop || stopMutation.isPending}
													onClick={() => stopMutation.mutate({ id: sandbox.id })}
												>
													Stop
												</Button>
												<Button
													variant="outline"
													size="sm"
													className="h-8 px-3 text-xs text-red-600 dark:text-red-400"
													disabled={isTerminal || killMutation.isPending}
													onClick={() => killMutation.mutate({ id: sandbox.id })}
												>
													Kill
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				)}
				{(stopMutation.isError || killMutation.isError) && (
					<p className="border-t px-5 py-3 text-sm text-red-600 dark:text-red-400">
						{stopMutation.error?.message ?? killMutation.error?.message}
					</p>
				)}
			</CardContent>
		</Card>
	)
}

const activityByStatus: Record<
	SandboxStatus,
	{ icon: typeof Box; tone: keyof typeof toneClasses; verb: string }
> = {
	starting: { icon: Box, tone: "blue", verb: "is starting" },
	running: { icon: Activity, tone: "green", verb: "is running" },
	stopping: { icon: CircleStop, tone: "amber", verb: "is stopping" },
	stopped: { icon: Square, tone: "gray", verb: "stopped" },
	failed: { icon: AlertTriangle, tone: "red", verb: "failed" },
}

const toneClasses = {
	blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
	green:
		"bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
	gray: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
	red: "bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
	amber:
		"bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
} as const

function RightRail({ sandboxes }: { sandboxes: Sandbox[] }) {
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	const recent = [...sandboxes]
		.sort(
			(a, b) =>
				new Date(b.finishedAt ?? b.startedAt ?? b.createdAt).getTime() -
				new Date(a.finishedAt ?? a.startedAt ?? a.createdAt).getTime(),
		)
		.slice(0, 5)

	const failed = sandboxes.filter((sandbox) => sandbox.status === "failed")

	return (
		<aside className="w-80 shrink-0 space-y-4">
			<Card>
				<CardHeader className="px-4 py-4">
					<CardTitle className="text-base">Recent Activity</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 px-4 pt-0">
					{recent.length === 0 && (
						<p className="text-sm text-slate-500 dark:text-muted-foreground">No activity yet.</p>
					)}
					{recent.map((sandbox) => {
						const activity = activityByStatus[sandbox.status]
						const Icon = activity.icon
						return (
							<div key={sandbox.id} className="grid grid-cols-[24px_1fr_auto] gap-3 text-sm">
								<div
									className={cn(
										"mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1",
										toneClasses[activity.tone],
									)}
								>
									<Icon className="h-3.5 w-3.5" />
								</div>
								<div>
									<p className="font-medium leading-5 text-slate-800 dark:text-foreground">
										{sandboxLabel(sandbox)} {activity.verb}
									</p>
									<p className="leading-5 text-slate-600 dark:text-muted-foreground">
										{sandbox.image}
									</p>
								</div>
								<span className="text-xs text-slate-500 dark:text-muted-foreground">
									{formatAge(sandbox.finishedAt ?? sandbox.startedAt ?? sandbox.createdAt)}
								</span>
							</div>
						)
					})}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="px-4 py-4">
					<CardTitle className="text-base">Alerts</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 px-4 pt-0">
					{failed.length === 0 && (
						<p className="text-sm text-slate-500 dark:text-muted-foreground">
							No failed sandboxes.
						</p>
					)}
					{failed.map((sandbox) => (
						<div key={sandbox.id} className="grid grid-cols-[24px_1fr_auto] gap-3 text-sm">
							<div
								className={cn(
									"mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-1",
									toneClasses.red,
								)}
							>
								<AlertTriangle className="h-3.5 w-3.5" />
							</div>
							<div>
								<p className="font-medium leading-5 text-slate-800 dark:text-foreground">
									{sandboxLabel(sandbox)} failed
								</p>
								<p className="leading-5 text-slate-600 dark:text-muted-foreground">
									{sandbox.statusReason ?? "No reason reported"}
								</p>
							</div>
							<span className="text-xs text-slate-500 dark:text-muted-foreground">
								{formatAge(sandbox.finishedAt ?? sandbox.createdAt)}
							</span>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="px-4 py-4">
					<CardTitle className="text-base">Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 px-4 pt-0">
					<Button
						className="h-11 w-full justify-start gap-3"
						onClick={() => void navigate({ to: "/sandboxes" })}
					>
						<Plus className="h-4 w-4" />
						Create Sandbox
					</Button>
					<Button
						variant="outline"
						className="h-11 w-full justify-start gap-3"
						onClick={() => void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })}
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
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

	const listQuery = useQuery(
		orpc.sandbox.list.queryOptions({
			enabled: authStatusQuery.isSuccess,
			refetchInterval: 3000,
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

	const sandboxes = listQuery.data?.sandboxes ?? []

	return (
		<main className="flex min-w-0 flex-1 flex-col">
			<div className="flex flex-1 gap-4 p-4">
				<section className="min-w-0 flex-1 space-y-4">
					<StatCards sandboxes={sandboxes} />
					{listQuery.isError && (
						<p className="text-sm text-red-600 dark:text-red-400">
							Failed to load sandboxes: {listQuery.error.message}
						</p>
					)}
					<SandboxOverviewTable sandboxes={sandboxes} isLoading={listQuery.isLoading} />
				</section>
				<RightRail sandboxes={sandboxes} />
			</div>
		</main>
	)
}
