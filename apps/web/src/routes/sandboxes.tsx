import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { Sandbox, SandboxStatus } from "@wtrn/rpc-contract"
import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@wtrn/components/card"
import { Field, FieldGroup, FieldLabel } from "@wtrn/components/field"
import { Input } from "@wtrn/components/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@wtrn/components/table"
import React, { useEffect, useState } from "react"
import { cn } from "tailwind-variants"
import { orpc } from "../api.ts"

export const Route = createFileRoute("/sandboxes")({
	component: Sandboxes,
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
		<div>
			<div className="flex items-center gap-2">
				<span
					aria-label={sandbox.status}
					className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassByStatus[sandbox.status])}
				/>
				<span className="text-sm capitalize">{sandbox.status}</span>
			</div>
			{sandbox.statusReason && (
				<p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">
					{sandbox.statusReason}
				</p>
			)}
		</div>
	)
}

function formatAge(isoDate: string) {
	const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000))

	if (seconds < 60) return `${seconds}s`
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`

	return `${Math.floor(seconds / 86400)}d`
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

function CreateSandboxCard() {
	const queryClient = useQueryClient()
	const [name, setName] = useState("")
	const [image, setImage] = useState("")
	const [envText, setEnvText] = useState("")
	const [cpuRequest, setCpuRequest] = useState("")
	const [cpuLimit, setCpuLimit] = useState("")
	const [memoryRequest, setMemoryRequest] = useState("")
	const [memoryLimit, setMemoryLimit] = useState("")

	const createMutation = useMutation(
		orpc.sandbox.create.mutationOptions({
			onSuccess: () => {
				setName("")
				setImage("")
				setEnvText("")
				setCpuRequest("")
				setCpuLimit("")
				setMemoryRequest("")
				setMemoryLimit("")
				void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
			},
		}),
	)

	function create(event: { preventDefault: () => void }) {
		event.preventDefault()
		createMutation.mutate({
			env: parseEnvLines(envText),
			image: image.trim() || undefined,
			name: name.trim() || undefined,
			resources: {
				cpuLimit: cpuLimit.trim() || undefined,
				cpuRequest: cpuRequest.trim() || undefined,
				memoryLimit: memoryLimit.trim() || undefined,
				memoryRequest: memoryRequest.trim() || undefined,
			},
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Create Sandbox</CardTitle>
				<CardDescription>
					Starts a pod in the cluster. Leave image empty for the default placeholder image.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={create}>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="sandbox-name">Name (optional)</FieldLabel>
								<Input
									id="sandbox-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder="my-agent"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="sandbox-image">Image (optional)</FieldLabel>
								<Input
									id="sandbox-image"
									value={image}
									onChange={(event) => setImage(event.target.value)}
									placeholder="sandhost-agent:dev"
								/>
							</Field>
						</div>
						<div className="grid gap-4 md:grid-cols-4">
							<Field>
								<FieldLabel htmlFor="sandbox-cpu-request">CPU request</FieldLabel>
								<Input
									id="sandbox-cpu-request"
									value={cpuRequest}
									onChange={(event) => setCpuRequest(event.target.value)}
									placeholder="50m"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="sandbox-cpu-limit">CPU limit</FieldLabel>
								<Input
									id="sandbox-cpu-limit"
									value={cpuLimit}
									onChange={(event) => setCpuLimit(event.target.value)}
									placeholder="250m"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="sandbox-memory-request">Memory request</FieldLabel>
								<Input
									id="sandbox-memory-request"
									value={memoryRequest}
									onChange={(event) => setMemoryRequest(event.target.value)}
									placeholder="64Mi"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="sandbox-memory-limit">Memory limit</FieldLabel>
								<Input
									id="sandbox-memory-limit"
									value={memoryLimit}
									onChange={(event) => setMemoryLimit(event.target.value)}
									placeholder="256Mi"
								/>
							</Field>
						</div>
						<Field>
							<FieldLabel htmlFor="sandbox-env">
								Environment variables (KEY=VALUE per line)
							</FieldLabel>
							<textarea
								id="sandbox-env"
								value={envText}
								onChange={(event) => setEnvText(event.target.value)}
								rows={3}
								placeholder={"AGENT_TOKEN=...\nLOG_LEVEL=debug"}
								className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
							/>
						</Field>
						{createMutation.isError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{createMutation.error.message}
							</p>
						)}
						<div>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create Sandbox"}
							</Button>
						</div>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	)
}

function SandboxDetailPanel({ sandbox }: { sandbox: Sandbox }) {
	const [command, setCommand] = useState("")

	const logsQuery = useQuery(
		orpc.sandbox.logs.queryOptions({
			input: { id: sandbox.id },
			refetchInterval: 2000,
			retry: false,
		}),
	)
	const execMutation = useMutation(orpc.sandbox.exec.mutationOptions())

	function runCommand(event: { preventDefault: () => void }) {
		event.preventDefault()
		const trimmed = command.trim()
		if (!trimmed) return

		execMutation.mutate({ command: ["sh", "-c", trimmed], id: sandbox.id })
	}

	const logs = logsQuery.data?.available
		? logsQuery.data.logs || "(no output yet)"
		: "(pod no longer exists — logs unavailable)"

	return (
		<div className="space-y-4 bg-slate-50/60 px-5 py-4 dark:bg-muted/20">
			<div>
				<p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-muted-foreground">
					Logs (live)
				</p>
				<pre className="max-h-64 overflow-auto rounded-lg border border-input bg-white p-3 font-mono text-xs whitespace-pre-wrap text-slate-800 dark:bg-background dark:text-foreground/90">
					{logsQuery.isLoading ? "Loading logs..." : logs}
				</pre>
			</div>
			<div>
				<p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-muted-foreground">
					Run command (via sh -c)
				</p>
				<form onSubmit={runCommand} className="flex items-center gap-2">
					<Input
						value={command}
						onChange={(event) => setCommand(event.target.value)}
						placeholder="ps aux"
						className="font-mono text-sm"
						disabled={sandbox.status !== "running"}
					/>
					<Button
						type="submit"
						size="sm"
						className="h-8 px-3 text-xs"
						disabled={sandbox.status !== "running" || execMutation.isPending}
					>
						{execMutation.isPending ? "Running..." : "Run"}
					</Button>
				</form>
				{execMutation.isError && (
					<p className="mt-2 text-xs text-red-600 dark:text-red-400">
						{execMutation.error.message}
					</p>
				)}
				{execMutation.data && (
					<pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-input bg-white p-3 font-mono text-xs whitespace-pre-wrap text-slate-800 dark:bg-background dark:text-foreground/90">
						{[
							execMutation.data.stdout,
							execMutation.data.stderr && `stderr: ${execMutation.data.stderr}`,
							`exit code: ${execMutation.data.exitCode ?? "unknown"}`,
						]
							.filter(Boolean)
							.join("\n")}
					</pre>
				)}
			</div>
		</div>
	)
}

function SandboxTable() {
	const queryClient = useQueryClient()
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const listQuery = useQuery(
		orpc.sandbox.list.queryOptions({
			refetchInterval: 3000,
			retry: false,
		}),
	)

	const invalidate = () => void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
	const stopMutation = useMutation(orpc.sandbox.stop.mutationOptions({ onSuccess: invalidate }))
	const killMutation = useMutation(orpc.sandbox.kill.mutationOptions({ onSuccess: invalidate }))

	const sandboxes = listQuery.data?.sandboxes ?? []

	return (
		<Card className="gap-0 overflow-hidden">
			<CardHeader className="border-b px-5 py-4">
				<CardTitle className="text-base">Sandboxes</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{sandboxes.length === 0 ? (
					<p className="px-5 py-8 text-sm text-slate-500 dark:text-muted-foreground">
						{listQuery.isLoading ? "Loading sandboxes..." : "No sandboxes yet."}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="bg-slate-50/80 dark:bg-muted/40">
								<TableHead className="pl-5">Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Image</TableHead>
								<TableHead>Pod</TableHead>
								<TableHead>Age</TableHead>
								<TableHead className="pr-5 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sandboxes.map((sandbox) => {
								const isTerminal = sandbox.status === "stopped" || sandbox.status === "failed"
								const canStop = sandbox.status === "starting" || sandbox.status === "running"
								const isExpanded = expandedId === sandbox.id

								return (
									<React.Fragment key={sandbox.id}>
										<TableRow className="h-14">
											<TableCell className="pl-5 font-medium">
												{sandbox.name ?? sandbox.id.slice(0, 8)}
											</TableCell>
											<TableCell>
												<StatusBadge sandbox={sandbox} />
											</TableCell>
											<TableCell className="text-xs text-slate-600 dark:text-muted-foreground">
												{sandbox.image}
											</TableCell>
											<TableCell className="font-mono text-xs text-slate-600 dark:text-muted-foreground">
												{sandbox.podName}
											</TableCell>
											<TableCell className="text-sm text-slate-700 dark:text-foreground/80">
												{formatAge(sandbox.createdAt)}
											</TableCell>
											<TableCell className="pr-5 text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant={isExpanded ? "default" : "outline"}
														size="sm"
														className="h-8 px-3 text-xs"
														onClick={() => setExpandedId(isExpanded ? null : sandbox.id)}
													>
														{isExpanded ? "Hide" : "Details"}
													</Button>
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
										{isExpanded && (
											<TableRow>
												<TableCell colSpan={6} className="p-0">
													<SandboxDetailPanel sandbox={sandbox} />
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								)
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}

function Sandboxes() {
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
			<div className="flex-1 space-y-4 p-4">
				<CreateSandboxCard />
				<SandboxTable />
			</div>
		</main>
	)
}
