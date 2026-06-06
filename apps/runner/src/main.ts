import { runHeartbeatLoop } from "./heartbeat.ts"
import { logError } from "./logger.ts"
import { FakeSandboxDriver } from "./sandbox-driver.ts"

runHeartbeatLoop(new FakeSandboxDriver()).catch((error) => {
	logError("runner.fatal", error)
	process.exitCode = 1
})
