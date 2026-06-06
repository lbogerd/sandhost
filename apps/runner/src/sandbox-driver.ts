import type { LocalSandbox, RunnerCommand } from "@wtrn/rpc-contract"
import { log } from "./logger.ts"

export type SandboxDriver = {
	kill(id: string): Promise<void>
	list(): Promise<LocalSandbox[]>
	start(spec: { env: Record<string, string>; id: string; image: string }): Promise<LocalSandbox>
	stop(id: string): Promise<void>
}

export class FakeSandboxDriver implements SandboxDriver {
	#sandboxes = new Map<string, LocalSandbox>()

	async list(): Promise<LocalSandbox[]> {
		return [...this.#sandboxes.values()]
	}

	async start(spec: {
		env: Record<string, string>
		id: string
		image: string
	}): Promise<LocalSandbox> {
		const sandbox: LocalSandbox = {
			id: spec.id,
			startedAt: new Date().toISOString(),
			state: "running",
		}

		this.#sandboxes.set(spec.id, sandbox)
		log("sandbox.fake.started", {
			envKeys: Object.keys(spec.env),
			image: spec.image,
			sandboxId: spec.id,
		})

		return sandbox
	}

	async stop(id: string): Promise<void> {
		const sandbox = this.#sandboxes.get(id)

		if (sandbox) {
			this.#sandboxes.set(id, { ...sandbox, state: "stopped" })
		}

		log("sandbox.fake.stopped", { sandboxId: id })
	}

	async kill(id: string): Promise<void> {
		this.#sandboxes.delete(id)
		log("sandbox.fake.killed", { sandboxId: id })
	}
}

export async function dispatchRunnerCommand(driver: SandboxDriver, command: RunnerCommand) {
	switch (command.type) {
		case "startSandbox":
			await driver.start({
				env: command.env,
				id: command.sandboxId,
				image: command.image,
			})
			break
		case "stopSandbox":
			await driver.stop(command.sandboxId)
			break
		case "killSandbox":
			await driver.kill(command.sandboxId)
			break
	}
}
