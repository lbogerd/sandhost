import { hostname } from "node:os"
import { env } from "./env.ts"
import { apiClient } from "./api.ts"
import { log, logError } from "./logger.ts"
import { collectTelemetry } from "./telemetry.ts"
import { dispatchRunnerCommand, type SandboxDriver } from "./sandbox-driver.ts"
import type { RunnerCommand } from "@wtrn/rpc-contract"

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
			await runCommand(driver, command)
		}
	} catch (error) {
		logError("runner.heartbeat.failed", error, {
			runnerId: env.RUNNER_ID,
		})
	}
}

async function runCommand(driver: SandboxDriver, command: RunnerCommand) {
	try {
		await apiClient.runner.reportCommandResult({
			commandId: command.id,
			runnerId: env.RUNNER_ID,
			status: "running",
		})

		await dispatchRunnerCommand(driver, command)

		await apiClient.runner.reportCommandResult({
			commandId: command.id,
			runnerId: env.RUNNER_ID,
			status: "succeeded",
		})

		log("runner.command.completed", {
			commandId: command.id,
			commandType: command.type,
		})
	} catch (error) {
		logError("runner.command.failed", error, {
			commandId: command.id,
			commandType: command.type,
		})

		try {
			await apiClient.runner.reportCommandResult({
				commandId: command.id,
				error: getErrorMessage(error),
				runnerId: env.RUNNER_ID,
				status: "failed",
			})
		} catch (reportError) {
			logError("runner.command.result_report_failed", reportError, {
				commandId: command.id,
				commandType: command.type,
			})
		}
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}
