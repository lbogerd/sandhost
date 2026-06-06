export function log(event: string, data: Record<string, unknown> = {}) {
	console.log(JSON.stringify({ event, level: "info", time: new Date().toISOString(), ...data }))
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
	console.error(
		JSON.stringify({
			error: error instanceof Error ? error.message : String(error),
			event,
			level: "error",
			time: new Date().toISOString(),
			...data,
		}),
	)
}
