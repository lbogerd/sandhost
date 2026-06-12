const quantityPattern = /^(\d+(?:\.\d+)?)(m|k|Ki|Mi|Gi|Ti|Pi|Ei|M|G|T|P|E)?$/

export type ParsedQuantity = {
	amount: string
	unit: string
}

export function parseQuantity(value: string): ParsedQuantity | null {
	const match = quantityPattern.exec(value.trim())
	if (!match) return null

	return { amount: match[1], unit: match[2] ?? "" }
}

export function formatQuantity(amount: string, unit: string): string {
	const trimmed = amount.trim()
	return trimmed ? `${trimmed}${unit}` : ""
}

export type ResourceKind = "cpu" | "memory"

export type UnitOption = {
	label: string
	value: string
}

const baseUnitOptions: Record<ResourceKind, UnitOption[]> = {
	cpu: [
		{ label: "millicores", value: "m" },
		{ label: "cores", value: "" },
	],
	memory: [
		{ label: "MiB", value: "Mi" },
		{ label: "GiB", value: "Gi" },
	],
}

export const defaultUnitFor: Record<ResourceKind, string> = {
	cpu: "m",
	memory: "Mi",
}

export function unitOptionsFor(kind: ResourceKind, currentUnit: string): UnitOption[] {
	const options = baseUnitOptions[kind]
	if (options.some((option) => option.value === currentUnit)) {
		return options
	}

	return [
		...options,
		{ label: currentUnit || (kind === "cpu" ? "cores" : "bytes"), value: currentUnit },
	]
}
