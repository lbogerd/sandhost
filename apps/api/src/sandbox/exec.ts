import { Exec, type V1Status } from "@kubernetes/client-node"
import { Writable } from "node:stream"
import { env } from "../env.ts"
import { getKubeConfig } from "./k8s.ts"
import { SANDBOX_CONTAINER_NAME } from "./pod-spec.ts"

const EXEC_TIMEOUT_MS = 30_000

export type ExecResult = {
	exitCode: number | null
	stderr: string
	stdout: string
}

export async function execInSandboxPod(podName: string, command: string[]): Promise<ExecResult> {
	const exec = new Exec(getKubeConfig())
	let stdout = ""
	let stderr = ""

	return new Promise<ExecResult>((resolve, reject) => {
		let settled = false

		const settle = (result: ExecResult | Error) => {
			if (settled) return
			settled = true
			clearTimeout(timer)

			if (result instanceof Error) {
				reject(result)
			} else {
				resolve(result)
			}
		}

		const timer = setTimeout(() => {
			settle(new Error(`Command timed out after ${EXEC_TIMEOUT_MS}ms`))
		}, EXEC_TIMEOUT_MS)

		exec
			.exec(
				env.SANDBOX_NAMESPACE,
				podName,
				SANDBOX_CONTAINER_NAME,
				command,
				collectInto((chunk) => {
					stdout += chunk
				}),
				collectInto((chunk) => {
					stderr += chunk
				}),
				null,
				false,
				(status) => {
					settle({ exitCode: getExitCode(status), stderr, stdout })
				},
			)
			.then((webSocket) => {
				webSocket.on("error", (error: Error) => settle(error))
				// The status callback normally fires first; this covers pods
				// whose exec channel closes without a status frame.
				webSocket.on("close", () => settle({ exitCode: null, stderr, stdout }))
			})
			.catch((error: unknown) => {
				settle(error instanceof Error ? error : new Error(String(error)))
			})
	})
}

function collectInto(append: (chunk: string) => void): Writable {
	return new Writable({
		write(chunk, _encoding, callback) {
			append(String(chunk))
			callback()
		},
	})
}

function getExitCode(status: V1Status): number | null {
	if (status.status === "Success") return 0

	const exitCodeCause = status.details?.causes?.find((cause) => cause.reason === "ExitCode")

	if (exitCodeCause?.message) {
		const exitCode = Number.parseInt(exitCodeCause.message, 10)
		if (!Number.isNaN(exitCode)) return exitCode
	}

	return null
}
