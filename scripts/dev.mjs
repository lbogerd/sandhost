#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const forwardedArgs = process.argv.slice(2)
if (forwardedArgs[0] === "--") forwardedArgs.shift()

const turboArgs = ["dev", ...forwardedArgs]
const turboBin = fileURLToPath(
	new URL(
		process.platform === "win32" ? "../node_modules/.bin/turbo.cmd" : "../node_modules/.bin/turbo",
		import.meta.url,
	),
)
const child = spawn(turboBin, turboArgs, {
	detached: process.platform !== "win32",
	env: process.env,
	stdio: "inherit",
})

let isShuttingDown = false
let forceKillTimer

function exitCodeForSignal(signal) {
	if (signal === "SIGHUP") return 129
	if (signal === "SIGINT") return 130
	if (signal === "SIGTERM") return 143
	return 1
}

function killDevTree(signal) {
	if (!child.pid) return

	if (process.platform === "win32") {
		spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
			stdio: "ignore",
			windowsHide: true,
		})
		return
	}

	try {
		process.kill(-child.pid, signal)
	} catch (error) {
		if (error?.code !== "ESRCH") throw error
	}
}

function shutdown(signal) {
	if (isShuttingDown) return
	isShuttingDown = true

	killDevTree(signal)

	forceKillTimer = setTimeout(() => {
		killDevTree("SIGKILL")
		process.exit(exitCodeForSignal(signal))
	}, 5_000)
	forceKillTimer.unref()
}

process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)
process.once("SIGHUP", shutdown)

child.once("exit", (code, signal) => {
	if (forceKillTimer) clearTimeout(forceKillTimer)

	if (code !== null) {
		process.exit(code)
	}

	process.exit(exitCodeForSignal(signal))
})

child.once("error", (error) => {
	console.error(`Failed to start turbo: ${error.message}`)
	process.exit(1)
})
