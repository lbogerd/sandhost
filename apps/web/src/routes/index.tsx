import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { Sandbox, SandboxConfig, SandboxStatus } from "@wtrn/rpc-contract"
import { useEffect, useState } from "react"
import { orpc } from "../api.ts"
import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@wtrn/components/card"
import {
	Activity,
	AlertTriangle,
	Box,
	CircleStop,
	Plus,
	RefreshCw,
	Save,
	Square,
	Trash2,
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
import { formatAge } from "../logic/formatAge"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@wtrn/components/dialog"
import {
	Form,
	FormControl,
	FormErrorList,
	FormField,
	FormLabel,
	FormMessage,
	FormSubmit,
} from "@wtrn/components/form"
import { FieldGroup } from "@wtrn/components/field"
import { Input } from "@wtrn/components/input"
import { Textarea } from "@wtrn/components/textarea"
import * as z from "zod"

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

const resourceQuantitySchema = z.string().refine((value) => {
	const trimmed = value.trim()
	return !trimmed || /^\d+(\.\d+)?(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)?$/.test(trimmed)
}, "Invalid resource quantity")

const createSandboxFormSchema = z.object({
	configName: z.string(),
	cpuLimit: resourceQuantitySchema,
	cpuRequest: resourceQuantitySchema,
	envText: z.string(),
	image: z.string(),
	intent: z.enum(["create", "save"]).default("create"),
	memoryLimit: resourceQuantitySchema,
	memoryRequest: resourceQuantitySchema,
	name: z.string(),
})

type CreateSandboxFormValues = z.input<typeof createSandboxFormSchema> & {
	[key: string]: FormDataEntryValue | FormDataEntryValue[]
}

function createEmptySandboxFormValues(): CreateSandboxFormValues {
	return {
		configName: "",
		cpuLimit: "",
		cpuRequest: "",
		envText: "",
		image: "",
		intent: "create",
		memoryLimit: "",
		memoryRequest: "",
		name: "",
	}
}

function parseEnvLines(value: string): Record<string, string> {
	const env: Record<string, string> = {}

	for (const line of value.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) continue

		const separatorIndex = trimmed.indexOf("=")
		if (separatorIndex <= 0) continue

		env[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1)
	}

	return env
}

function formatEnvLines(env: Record<string, string>) {
	return Object.entries(env)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n")
}

function formValuesFromConfig(config: SandboxConfig): CreateSandboxFormValues {
	return {
		configName: config.name,
		cpuLimit: config.resources?.cpuLimit ?? "",
		cpuRequest: config.resources?.cpuRequest ?? "",
		envText: formatEnvLines(config.env),
		image: config.image ?? "",
		intent: "create",
		memoryLimit: config.resources?.memoryLimit ?? "",
		memoryRequest: config.resources?.memoryRequest ?? "",
		name: config.sandboxName ?? "",
	}
}

function formValuesFromSubmission(
	values: z.output<typeof createSandboxFormSchema>,
): CreateSandboxFormValues {
	return {
		configName: values.configName,
		cpuLimit: values.cpuLimit,
		cpuRequest: values.cpuRequest,
		envText: values.envText,
		image: values.image,
		intent: "create",
		memoryLimit: values.memoryLimit,
		memoryRequest: values.memoryRequest,
		name: values.name,
	}
}

function getSandboxPayload(values: z.output<typeof createSandboxFormSchema>) {
	return {
		env: parseEnvLines(values.envText),
		image: values.image.trim() || undefined,
		name: values.name.trim() || undefined,
		resources: {
			cpuLimit: values.cpuLimit.trim() || undefined,
			cpuRequest: values.cpuRequest.trim() || undefined,
			memoryLimit: values.memoryLimit.trim() || undefined,
			memoryRequest: values.memoryRequest.trim() || undefined,
		},
	}
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

function CreateSandboxDialog({
	onOpenChange,
	open,
}: {
	onOpenChange: (open: boolean) => void
	open: boolean
}) {
	const queryClient = useQueryClient()
	const [formKey, setFormKey] = useState(0)
	const [defaultValues, setDefaultValues] = useState<CreateSandboxFormValues>(
		createEmptySandboxFormValues,
	)

	const configsQuery = useQuery(
		orpc.sandbox.config.list.queryOptions({
			enabled: open,
			retry: false,
		}),
	)
	const createSandboxMutation = useMutation(
		orpc.sandbox.create.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
			},
		}),
	)
	const createConfigMutation = useMutation(
		orpc.sandbox.config.create.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.sandbox.config.key() })
			},
		}),
	)
	const deleteConfigMutation = useMutation(
		orpc.sandbox.config.delete.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.sandbox.config.key() })
			},
		}),
	)

	const configs = configsQuery.data?.configs ?? []

	function useConfig(id: string) {
		const config = configs.find((candidate) => candidate.id === id)
		const values = config ? formValuesFromConfig(config) : createEmptySandboxFormValues()

		setDefaultValues(values)
		setFormKey((key) => key + 1)
	}

	async function submit(values: z.output<typeof createSandboxFormSchema>) {
		const payload = getSandboxPayload(values)

		if (values.intent === "save") {
			const configName = values.configName.trim()

			if (!configName) {
				throw new Error("Config name is required.")
			}

			await createConfigMutation.mutateAsync({
				...payload,
				name: configName,
				sandboxName: payload.name,
			})
			setDefaultValues(formValuesFromSubmission(values))
			setFormKey((key) => key + 1)
			return
		}

		await createSandboxMutation.mutateAsync(payload)
		setDefaultValues(createEmptySandboxFormValues())
		setFormKey((key) => key + 1)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Create Sandbox</DialogTitle>
					<DialogDescription>Start a pod from scratch or reuse a saved config.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5 lg:grid-cols-[220px_1fr]">
					<section className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-sm font-medium">Saved Configs</h2>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => useConfig("")}
							>
								Clear
							</Button>
						</div>
						{configsQuery.isLoading && (
							<p className="text-sm text-slate-500 dark:text-muted-foreground">
								Loading configs...
							</p>
						)}
						{configsQuery.isError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								Failed to load configs: {configsQuery.error.message}
							</p>
						)}
						{!configsQuery.isLoading && configs.length === 0 && (
							<p className="text-sm text-slate-500 dark:text-muted-foreground">
								No saved configs yet.
							</p>
						)}
						<div className="space-y-2">
							{configs.map((config) => (
								<div
									key={config.id}
									className="rounded-lg border border-input p-2 text-sm dark:bg-input/20"
								>
									<div className="flex items-start justify-between gap-2">
										<button
											type="button"
											className="min-w-0 flex-1 text-left"
											onClick={() => useConfig(config.id)}
										>
											<span className="block truncate font-medium">{config.name}</span>
											<span className="block truncate text-xs text-slate-500 dark:text-muted-foreground">
												{config.image ?? "Default image"}
											</span>
										</button>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="text-red-600 dark:text-red-400"
											disabled={deleteConfigMutation.isPending}
											onClick={() => deleteConfigMutation.mutate({ id: config.id })}
										>
											<Trash2 className="h-3.5 w-3.5" />
											<span className="sr-only">Delete {config.name}</span>
										</Button>
									</div>
								</div>
							))}
						</div>
					</section>

					<Form
						key={formKey}
						schema={createSandboxFormSchema}
						defaultValues={defaultValues}
						onSubmit={submit}
					>
						<FieldGroup>
							<FormField name="configName">
								<FormLabel>Config name</FormLabel>
								<FormControl>
									<Input placeholder="Small debug pod" />
								</FormControl>
								<FormMessage />
							</FormField>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField name="name">
									<FormLabel>Sandbox name (optional)</FormLabel>
									<FormControl>
										<Input placeholder="my-agent" />
									</FormControl>
									<FormMessage />
								</FormField>
								<FormField name="image">
									<FormLabel>Image (optional)</FormLabel>
									<FormControl>
										<Input placeholder="sandhost-agent:dev" />
									</FormControl>
									<FormMessage />
								</FormField>
							</div>
							<div className="grid gap-4 md:grid-cols-4">
								<FormField name="cpuRequest">
									<FormLabel>CPU request</FormLabel>
									<FormControl>
										<Input placeholder="50m" />
									</FormControl>
									<FormMessage />
								</FormField>
								<FormField name="cpuLimit">
									<FormLabel>CPU limit</FormLabel>
									<FormControl>
										<Input placeholder="250m" />
									</FormControl>
									<FormMessage />
								</FormField>
								<FormField name="memoryRequest">
									<FormLabel>Memory request</FormLabel>
									<FormControl>
										<Input placeholder="64Mi" />
									</FormControl>
									<FormMessage />
								</FormField>
								<FormField name="memoryLimit">
									<FormLabel>Memory limit</FormLabel>
									<FormControl>
										<Input placeholder="256Mi" />
									</FormControl>
									<FormMessage />
								</FormField>
							</div>
							<FormField name="envText">
								<FormLabel>Environment variables (KEY=VALUE per line)</FormLabel>
								<FormControl>
									<Textarea rows={3} placeholder={"AGENT_TOKEN=...\nLOG_LEVEL=debug"} />
								</FormControl>
								<FormMessage />
							</FormField>
							<FormErrorList />
							<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
								<FormSubmit
									name="intent"
									value="save"
									variant="outline"
									disabled={createConfigMutation.isPending}
								>
									<Save className="h-4 w-4" />
									{createConfigMutation.isPending ? "Saving..." : "Save Config"}
								</FormSubmit>
								<FormSubmit name="intent" value="create" disabled={createSandboxMutation.isPending}>
									<Plus className="h-4 w-4" />
									{createSandboxMutation.isPending ? "Creating..." : "Create Sandbox"}
								</FormSubmit>
							</div>
						</FieldGroup>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function SandboxOverviewTable({
	sandboxes,
	isLoading,
}: {
	sandboxes: Sandbox[]
	isLoading: boolean
}) {
	const queryClient = useQueryClient()
	const invalidate = () => void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
	const stopMutation = useMutation(orpc.sandbox.stop.mutationOptions({ onSuccess: invalidate }))
	const killMutation = useMutation(orpc.sandbox.kill.mutationOptions({ onSuccess: invalidate }))

	return (
		<Card className="gap-0 overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
				<CardTitle className="text-base">Agent Sandboxes</CardTitle>
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

function RightRail({
	onCreateSandbox,
	sandboxes,
}: {
	onCreateSandbox: () => void
	sandboxes: Sandbox[]
}) {
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
					<Button className="h-11 w-full justify-start gap-3" onClick={onCreateSandbox}>
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
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
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
			<CreateSandboxDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
			<div className="flex flex-1 gap-4 p-4">
				<section className="min-w-0 flex-1 space-y-4">
					<StatCards sandboxes={sandboxes} />
					{listQuery.isError && (
						<p className="text-sm text-red-600 dark:text-red-400">
							Failed to load sandboxes: {listQuery.error.message}
						</p>
					)}
					<SandboxOverviewTable
						sandboxes={sandboxes}
						isLoading={listQuery.isLoading}
						onCreateSandbox={() => setCreateDialogOpen(true)}
					/>
				</section>
				<RightRail sandboxes={sandboxes} onCreateSandbox={() => setCreateDialogOpen(true)} />
			</div>
		</main>
	)
}
