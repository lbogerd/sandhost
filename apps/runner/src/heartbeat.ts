import { hostname } from "node:os"
import { env } from "./env.ts"
import { apiClient } from "./api.ts"
import { log, logError } from "./logger.ts"
import { collectTelemetry } from "./telemetry.ts"
import { dispatchRunnerCommand, type SandboxDriver } from "./sandbox-driver.ts"

export async function runHeartbeatLoop(driver: SandboxDriver) {
	log("runner.started", {
		heartbeatIntervalMs: env.HEARTBEAT_INTERVAL_MS,
		rpcUrl: env.API_RPC_URL,
		runnerId: env.RUNNER_ID,
	})

	while (true) {
		await runHeartbeat(driver)
		await sleep(env.HEARTBEAT_INTERVAL_MS)
	}
}

async function runHeartbeat(driver: SandboxDriver) {
	try {
		const telemetry = collectTelemetry()
		const sandboxes = await driver.list()

		const response = await apiClient.runner.heartbeat({
			hostname: hostname(),
			resources: telemetry,
			runnerId: env.RUNNER_ID,
			sandboxes,
			version: "0.0.1",
		})

		log("runner.heartbeat.accepted", {
			acceptedAt: response.acceptedAt,
			commandCount: response.commands.length,
			cpuUsagePercent: telemetry.cpuUsagePercent,
			memoryFreeBytes: telemetry.memoryFreeBytes,
			runningSandboxCount: sandboxes.filter((sandbox) => sandbox.state === "running").length,
		})

		for (const command of response.commands) {
			try {
				await dispatchRunnerCommand(driver, command)
				log("runner.command.completed", {
					commandId: command.id,
					commandType: command.type,
				})
			} catch (error) {
				logError("runner.command.failed", error, {
					commandId: command.id,
					commandType: command.type,
				})
			}
		}
	} catch (error) {
		logError("runner.heartbeat.failed", error, {
			runnerId: env.RUNNER_ID,
		})
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
