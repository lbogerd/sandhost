import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import type { SandboxConfig } from "@wtrn/rpc-contract"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@wtrn/components/badge"
import { Button } from "@wtrn/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@wtrn/components/dialog"
import { FieldGroup } from "@wtrn/components/field"
import {
	Form,
	FormControl,
	FormErrorList,
	FormField,
	FormLabel,
	FormMessage,
	FormSubmit,
	useForm,
} from "@wtrn/components/form"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@wtrn/components/input-group"
import { Input } from "@wtrn/components/input"
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@wtrn/components/item"
import { ScrollArea } from "@wtrn/components/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@wtrn/components/select"
import { Spinner } from "@wtrn/components/spinner"
import { Textarea } from "@wtrn/components/textarea"
import { Plus, Save, Trash2 } from "lucide-react"
import * as z from "zod"
import { orpc } from "../api.ts"
import {
	defaultUnitFor,
	formatQuantity,
	parseQuantity,
	unitOptionsFor,
	type ResourceKind,
} from "../logic/quantity.ts"

const quantityParam = z
	.string()
	.regex(/^\d+(\.\d+)?(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)?$/)
	.optional()
	.catch(undefined)

export const createSandboxSearchSchema = z.object({
	config: z.string().optional().catch(undefined),
	configName: z.string().optional().catch(undefined),
	cpuLimit: quantityParam,
	cpuRequest: quantityParam,
	createSandbox: z.literal(true).optional().catch(undefined),
	env: z.string().optional().catch(undefined),
	image: z.string().optional().catch(undefined),
	memoryLimit: quantityParam,
	memoryRequest: quantityParam,
	name: z.string().min(1).max(63).optional().catch(undefined),
})

type CreateSandboxSearch = z.infer<typeof createSandboxSearchSchema>

const amountSchema = z.string().refine((value) => {
	const trimmed = value.trim()
	return !trimmed || /^\d+(\.\d+)?$/.test(trimmed)
}, "Enter a positive number")

const unitSchema = z
	.string()
	.refine(
		(value) => value === "" || /^(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)$/.test(value),
		"Invalid unit",
	)

const createSandboxFormSchema = z
	.object({
		configName: z.string(),
		cpuLimitAmount: amountSchema,
		cpuLimitUnit: unitSchema,
		cpuRequestAmount: amountSchema,
		cpuRequestUnit: unitSchema,
		envText: z.string(),
		image: z.string(),
		intent: z.enum(["create", "save"]).default("create"),
		memoryLimitAmount: amountSchema,
		memoryLimitUnit: unitSchema,
		memoryRequestAmount: amountSchema,
		memoryRequestUnit: unitSchema,
		name: z.string(),
	})
	.transform((values) => ({
		...values,
		cpuLimit: formatQuantity(values.cpuLimitAmount, values.cpuLimitUnit),
		cpuRequest: formatQuantity(values.cpuRequestAmount, values.cpuRequestUnit),
		memoryLimit: formatQuantity(values.memoryLimitAmount, values.memoryLimitUnit),
		memoryRequest: formatQuantity(values.memoryRequestAmount, values.memoryRequestUnit),
	}))

type CreateSandboxFormValues = z.input<typeof createSandboxFormSchema> & {
	[key: string]: FormDataEntryValue | FormDataEntryValue[]
}

function createEmptySandboxFormValues(): CreateSandboxFormValues {
	return {
		configName: "",
		cpuLimitAmount: "",
		cpuLimitUnit: defaultUnitFor.cpu,
		cpuRequestAmount: "",
		cpuRequestUnit: defaultUnitFor.cpu,
		envText: "",
		image: "",
		intent: "create",
		memoryLimitAmount: "",
		memoryLimitUnit: defaultUnitFor.memory,
		memoryRequestAmount: "",
		memoryRequestUnit: defaultUnitFor.memory,
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

function quantityFields(value: string | null | undefined, kind: ResourceKind) {
	const parsed = value ? parseQuantity(value) : null

	return {
		amount: parsed?.amount ?? "",
		unit: parsed?.unit ?? defaultUnitFor[kind],
	}
}

function formValuesFromConfig(config: SandboxConfig): CreateSandboxFormValues {
	const cpuLimit = quantityFields(config.resources?.cpuLimit, "cpu")
	const cpuRequest = quantityFields(config.resources?.cpuRequest, "cpu")
	const memoryLimit = quantityFields(config.resources?.memoryLimit, "memory")
	const memoryRequest = quantityFields(config.resources?.memoryRequest, "memory")

	return {
		configName: config.name,
		cpuLimitAmount: cpuLimit.amount,
		cpuLimitUnit: cpuLimit.unit,
		cpuRequestAmount: cpuRequest.amount,
		cpuRequestUnit: cpuRequest.unit,
		envText: formatEnvLines(config.env),
		image: config.image ?? "",
		intent: "create",
		memoryLimitAmount: memoryLimit.amount,
		memoryLimitUnit: memoryLimit.unit,
		memoryRequestAmount: memoryRequest.amount,
		memoryRequestUnit: memoryRequest.unit,
		name: config.sandboxName ?? "",
	}
}

function formValuesFromSearch(search: CreateSandboxSearch): CreateSandboxFormValues {
	const cpuLimit = quantityFields(search.cpuLimit, "cpu")
	const cpuRequest = quantityFields(search.cpuRequest, "cpu")
	const memoryLimit = quantityFields(search.memoryLimit, "memory")
	const memoryRequest = quantityFields(search.memoryRequest, "memory")

	return {
		configName: search.configName ?? "",
		cpuLimitAmount: cpuLimit.amount,
		cpuLimitUnit: cpuLimit.unit,
		cpuRequestAmount: cpuRequest.amount,
		cpuRequestUnit: cpuRequest.unit,
		envText: search.env ?? "",
		image: search.image ?? "",
		intent: "create",
		memoryLimitAmount: memoryLimit.amount,
		memoryLimitUnit: memoryLimit.unit,
		memoryRequestAmount: memoryRequest.amount,
		memoryRequestUnit: memoryRequest.unit,
		name: search.name ?? "",
	}
}

function formValuesFromSubmission(
	values: z.output<typeof createSandboxFormSchema>,
): CreateSandboxFormValues {
	return {
		configName: values.configName,
		cpuLimitAmount: values.cpuLimitAmount,
		cpuLimitUnit: values.cpuLimitUnit,
		cpuRequestAmount: values.cpuRequestAmount,
		cpuRequestUnit: values.cpuRequestUnit,
		envText: values.envText,
		image: values.image,
		intent: "create",
		memoryLimitAmount: values.memoryLimitAmount,
		memoryLimitUnit: values.memoryLimitUnit,
		memoryRequestAmount: values.memoryRequestAmount,
		memoryRequestUnit: values.memoryRequestUnit,
		name: values.name,
	}
}

function getSandboxPayload(values: z.output<typeof createSandboxFormSchema>) {
	return {
		env: parseEnvLines(values.envText),
		image: values.image.trim() || undefined,
		name: values.name.trim() || undefined,
		resources: {
			cpuLimit: values.cpuLimit || undefined,
			cpuRequest: values.cpuRequest || undefined,
			memoryLimit: values.memoryLimit || undefined,
			memoryRequest: values.memoryRequest || undefined,
		},
	}
}

function ResourceQuantityField({
	kind,
	label,
	name,
	placeholder,
}: {
	kind: ResourceKind
	label: string
	name: string
	placeholder: string
}) {
	const form = useForm()
	const unitName = `${name}Unit`
	const unitDefault = String(form.getFieldValue(unitName) ?? defaultUnitFor[kind])
	const items = unitOptionsFor(kind, unitDefault)

	return (
		<FormField name={`${name}Amount`}>
			<FormLabel>{label}</FormLabel>
			<InputGroup>
				<FormControl>
					<InputGroupInput
						type="number"
						inputMode="decimal"
						min={0}
						step="any"
						placeholder={placeholder}
					/>
				</FormControl>
				<InputGroupAddon align="inline-end" className="cursor-default py-0 pr-1">
					<Select name={unitName} defaultValue={unitDefault} items={items}>
						<SelectTrigger
							size="sm"
							className="border-0 bg-transparent font-normal text-muted-foreground dark:bg-transparent dark:hover:bg-transparent"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false} align="end">
							{items.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</InputGroupAddon>
			</InputGroup>
			<FormMessage />
			<FormMessage errors={form.getFieldErrors(unitName)} />
		</FormField>
	)
}

export function CreateSandboxDialog({
	onOpenChange,
	open,
}: {
	onOpenChange: (open: boolean) => void
	open: boolean
}) {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const search = useSearch({ from: "/" })
	const [formKey, setFormKey] = useState(0)
	const [defaultValues, setDefaultValues] = useState<CreateSandboxFormValues>(() =>
		search.config ? createEmptySandboxFormValues() : formValuesFromSearch(search),
	)
	const appliedConfigIdRef = useRef<string | null>(null)
	const wasOpenRef = useRef(open)

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

	// Re-derive defaults from search params whenever the dialog (re)opens.
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			appliedConfigIdRef.current = null

			if (!search.config) {
				setDefaultValues(formValuesFromSearch(search))
				setFormKey((key) => key + 1)
			}
		}

		wasOpenRef.current = open
	}, [open, search])

	// Apply a ?config=<id> deep link once configs are loaded. The ref keeps query
	// refetches from re-applying the config and wiping user edits.
	useEffect(() => {
		if (!open || !search.config || !configsQuery.data) return
		if (appliedConfigIdRef.current === search.config) return

		appliedConfigIdRef.current = search.config

		const config = configsQuery.data.configs.find(
			(candidate: SandboxConfig) => candidate.id === search.config,
		)
		setDefaultValues(config ? formValuesFromConfig(config) : formValuesFromSearch(search))
		setFormKey((key) => key + 1)
	}, [open, search, configsQuery.data])

	function selectConfig(id: string) {
		appliedConfigIdRef.current = null
		void navigate({ to: "/", search: { config: id, createSandbox: true }, replace: true })
	}

	function clearForm() {
		appliedConfigIdRef.current = null
		setDefaultValues(createEmptySandboxFormValues())
		setFormKey((key) => key + 1)
		void navigate({ to: "/", search: { createSandbox: true }, replace: true })
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
								onClick={clearForm}
							>
								Clear
							</Button>
						</div>
						{configsQuery.isLoading && (
							<p className="flex items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground">
								<Spinner />
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
						<ScrollArea className="max-h-80">
							<ItemGroup className="gap-2">
								{configs.map((config: SandboxConfig) => (
									<Item
										key={config.id}
										variant={search.config === config.id ? "muted" : "outline"}
										size="xs"
									>
										<button
											type="button"
											className="min-w-0 flex-1 text-left"
											onClick={() => selectConfig(config.id)}
										>
											<ItemContent>
												<ItemTitle>
													<span className="truncate">{config.name}</span>
													{search.config === config.id && <Badge variant="secondary">Loaded</Badge>}
												</ItemTitle>
												<ItemDescription className="truncate">
													{config.image ?? "Default image"}
												</ItemDescription>
											</ItemContent>
										</button>
										<ItemActions>
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
										</ItemActions>
									</Item>
								))}
							</ItemGroup>
						</ScrollArea>
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
							<div className="grid gap-4 md:grid-cols-2">
								<ResourceQuantityField
									kind="cpu"
									label="CPU request"
									name="cpuRequest"
									placeholder="50"
								/>
								<ResourceQuantityField
									kind="cpu"
									label="CPU limit"
									name="cpuLimit"
									placeholder="250"
								/>
								<ResourceQuantityField
									kind="memory"
									label="Memory request"
									name="memoryRequest"
									placeholder="64"
								/>
								<ResourceQuantityField
									kind="memory"
									label="Memory limit"
									name="memoryLimit"
									placeholder="256"
								/>
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
									{createConfigMutation.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
									Save Config
								</FormSubmit>
								<FormSubmit name="intent" value="create" disabled={createSandboxMutation.isPending}>
									{createSandboxMutation.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
									Create Sandbox
								</FormSubmit>
							</div>
						</FieldGroup>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	)
}
