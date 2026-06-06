import { cpus, freemem, totalmem } from "node:os"

type CpuSnapshot = {
	idle: number
	total: number
}

let previousCpuSnapshot = getCpuSnapshot()

export type TelemetrySnapshot = {
	cpuUsagePercent: number
	memoryFreeBytes: number
	memoryTotalBytes: number
}

export function collectTelemetry(): TelemetrySnapshot {
	const currentCpuSnapshot = getCpuSnapshot()
	const idleDelta = currentCpuSnapshot.idle - previousCpuSnapshot.idle
	const totalDelta = currentCpuSnapshot.total - previousCpuSnapshot.total
	previousCpuSnapshot = currentCpuSnapshot

	const cpuUsagePercent =
		totalDelta > 0 ? Math.max(0, Math.min(100, 100 - (idleDelta / totalDelta) * 100)) : 0

	return {
		cpuUsagePercent,
		memoryFreeBytes: freemem(),
		memoryTotalBytes: totalmem(),
	}
}

function getCpuSnapshot(): CpuSnapshot {
	return cpus().reduce<CpuSnapshot>(
		(snapshot, cpu) => {
			const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0)

			return {
				idle: snapshot.idle + cpu.times.idle,
				total: snapshot.total + total,
			}
		},
		{ idle: 0, total: 0 },
	)
}
