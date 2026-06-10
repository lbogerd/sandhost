/**
 * High-level end-to-end test for the full sandbox workflow.
 *
 * Prerequisites (one-time, from the repo root):
 *   pnpm pg:up    # postgres
 *   pnpm db:push  # schema
 *   pnpm k8s:up   # kind cluster + sandhost namespace + sandhost-agent:dev image
 *
 * Run with: pnpm --filter @wtrn/api test
 *
 * The test boots its own API server on a separate port, signs in as a fresh
 * test user, then drives the typed RPC client through the whole lifecycle:
 * create (env via K8s Secret) -> running -> logs -> exec -> stop -> stopped.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApiClient, type ApiClient } from "@wtrn/api-client"

const PORT = 4801
const ORIGIN = `http://localhost:${PORT}`

let apiProcess: ChildProcess
let client: ApiClient

beforeAll(async () => {
	apiProcess = spawn("pnpm", ["exec", "tsx", "src/app.ts"], {
		cwd: import.meta.dirname + "/..",
		env: {
			...process.env,
			PORT: String(PORT),
			SANDBOX_RECONCILE_INTERVAL_MS: "1000",
		},
		stdio: ["ignore", "inherit", "inherit"],
	})

	await waitFor(
		async () => {
			const response = await fetch(ORIGIN).catch(() => null)
			return response?.ok ?? false
		},
		(ok) => ok,
		{ label: "API server to boot", timeoutMs: 30_000 },
	)

	client = await signInAsFreshTestUser()
})

afterAll(async () => {
	await fetch(`${ORIGIN}/api/delete-test-users`, { method: "POST" }).catch(() => {})
	apiProcess?.kill()
})

describe("sandbox full workflow", () => {
	it("creates, runs, logs, execs, and stops a sandbox", async () => {
		const created = await client.sandbox.create({
			env: { E2E_MARKER: "sandhost-e2e" },
			name: "e2e-test",
		})

		expect(created.status).toBe("starting")
		expect(created.podName).toBe(`sbx-${created.id}`)

		// The reconciler should observe the pod reach Running.
		const running = await waitFor(
			() => client.sandbox.get({ id: created.id }),
			(sandbox) => sandbox.status === "running",
			{ label: "sandbox to reach running", timeoutMs: 90_000 },
		)
		expect(running.startedAt).not.toBeNull()

		// The agent image logs heartbeats.
		const logsResult = await waitFor(
			() => client.sandbox.logs({ id: created.id }),
			(result) => result.available && result.logs.includes("agent: heartbeat"),
			{ label: "agent heartbeat in pod logs", timeoutMs: 30_000 },
		)
		expect(logsResult.logs).toContain("agent: started")

		// Env vars are injected via the per-sandbox Secret.
		const execResult = await client.sandbox.exec({
			command: ["sh", "-c", 'printf %s "$E2E_MARKER"'],
			id: created.id,
		})
		expect(execResult.exitCode).toBe(0)
		expect(execResult.stdout).toBe("sandhost-e2e")

		// Non-zero exit codes propagate.
		const failingExec = await client.sandbox.exec({
			command: ["sh", "-c", "exit 7"],
			id: created.id,
		})
		expect(failingExec.exitCode).toBe(7)

		// Graceful stop; the agent traps SIGTERM, so this is fast.
		const stopping = await client.sandbox.stop({ id: created.id })
		expect(["stopping", "stopped"]).toContain(stopping.status)

		const stopped = await waitFor(
			() => client.sandbox.get({ id: created.id }),
			(sandbox) => sandbox.status === "stopped",
			{ label: "sandbox to stop", timeoutMs: 60_000 },
		)
		expect(stopped.finishedAt).not.toBeNull()

		const listed = await client.sandbox.list()
		expect(listed.sandboxes.map((sandbox) => sandbox.id)).toContain(created.id)
	})
})

async function signInAsFreshTestUser(): Promise<ApiClient> {
	const createUserResponse = await fetch(`${ORIGIN}/api/create-test-user`, { method: "POST" })
	expect(createUserResponse.ok).toBe(true)

	const createdUser = (await createUserResponse.json()) as {
		password: string
		user: { user: { email: string } }
	}

	const signInResponse = await fetch(`${ORIGIN}/api/auth/sign-in/email`, {
		body: JSON.stringify({
			email: createdUser.user.user.email,
			password: createdUser.password,
		}),
		headers: {
			"Content-Type": "application/json",
			Origin: ORIGIN,
		},
		method: "POST",
	})
	expect(signInResponse.ok).toBe(true)

	const sessionCookie = signInResponse.headers
		.getSetCookie()
		.map((cookie) => cookie.split(";")[0])
		.join("; ")
	expect(sessionCookie.length).toBeGreaterThan(0)

	return createApiClient({
		fetch: (request, init) => {
			const requestWithCookie = new Request(request, init)
			requestWithCookie.headers.set("cookie", sessionCookie)
			return globalThis.fetch(requestWithCookie)
		},
		rpcUrl: `${ORIGIN}/rpc`,
	})
}

async function waitFor<T>(
	produce: () => Promise<T>,
	predicate: (value: T) => boolean,
	options: { label: string; timeoutMs: number },
): Promise<T> {
	const deadline = Date.now() + options.timeoutMs
	let lastValue: T | undefined

	while (Date.now() < deadline) {
		lastValue = await produce().catch(() => undefined as T)

		if (lastValue !== undefined && predicate(lastValue)) return lastValue

		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	throw new Error(
		`Timed out after ${options.timeoutMs}ms waiting for ${options.label}. Last value: ${JSON.stringify(lastValue)}`,
	)
}
