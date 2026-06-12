import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@wtrn/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@wtrn/components/card"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@wtrn/components/table"
import { Textarea } from "@wtrn/components/textarea"
import type { Sandbox, SandboxStatus } from "@wtrn/rpc-contract"
import React, { useEffect, useState } from "react"
import { cn } from "tailwind-variants"
import * as z from "zod"
import { orpc } from "../api.ts"
import { formatAge } from "../logic/formatAge"

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

const resourceQuantitySchema = z.string().refine((value) => {
	const trimmed = value.trim()
	return !trimmed || /^\d+(\.\d+)?(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)?$/.test(trimmed)
}, "Invalid resource quantity")

const createSandboxFormSchema = z.object({
	cpuLimit: resourceQuantitySchema,
	cpuRequest: resourceQuantitySchema,
	envText: z.string(),
	image: z.string(),
	memoryLimit: resourceQuantitySchema,
	memoryRequest: resourceQuantitySchema,
	name: z.string(),
})

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
	const [formKey, setFormKey] = useState(0)

	const createMutation = useMutation(
		orpc.sandbox.create.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.sandbox.key() })
			},
		}),
	)

	async function create(values: z.output<typeof createSandboxFormSchema>) {
		await createMutation.mutateAsync({
			env: parseEnvLines(values.envText),
			image: values.image.trim() || undefined,
			name: values.name.trim() || undefined,
			resources: {
				cpuLimit: values.cpuLimit.trim() || undefined,
				cpuRequest: values.cpuRequest.trim() || undefined,
				memoryLimit: values.memoryLimit.trim() || undefined,
				memoryRequest: values.memoryRequest.trim() || undefined,
			},
		})
		setFormKey((key) => key + 1)
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
				<Form key={formKey} schema={createSandboxFormSchema} onSubmit={create}>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
							<FormField name="name">
								<FormLabel>Name (optional)</FormLabel>
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
						<div>
							<FormSubmit disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create Sandbox"}
							</FormSubmit>
						</div>
					</FieldGroup>
				</Form>
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
