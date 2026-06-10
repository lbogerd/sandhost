import type { V1Pod } from "@kubernetes/client-node"
import { db } from "@wtrn/db"
import { and, eq, inArray, sandbox } from "@wtrn/db-schema"
import { env } from "../env.ts"
import {
	deleteSandboxPod,
	deleteSandboxSecret,
	listSandboxPods,
	listSandboxSecrets,
} from "./driver.ts"
import { getKubernetesErrorMessage } from "./k8s.ts"
import { SANDBOX_ID_LABEL } from "./pod-spec.ts"
import { derivePodState } from "./state.ts"

const NON_TERMINAL_STATUSES = ["starting", "running", "stopping"] as const

export function startSandboxReconciler(): () => void {
	let inFlight = false

	const timer = setInterval(async () => {
		if (inFlight) return
		inFlight = true

		try {
			await reconcile()
		} catch (error) {
			console.error(`sandbox reconciler: ${getKubernetesErrorMessage(error)}`)
		} finally {
			inFlight = false
		}
	}, env.SANDBOX_RECONCILE_INTERVAL_MS)

	timer.unref()

	return () => clearInterval(timer)
}

async function reconcile() {
	const pods = await listSandboxPods()
	const podsBySandboxId = new Map<string, V1Pod>()

	for (const pod of pods) {
		const sandboxId = pod.metadata?.labels?.[SANDBOX_ID_LABEL]
		if (sandboxId) podsBySandboxId.set(sandboxId, pod)
	}

	const activeSandboxes = await db
		.select()
		.from(sandbox)
		.where(inArray(sandbox.status, [...NON_TERMINAL_STATUSES]))

	for (const currentSandbox of activeSandboxes) {
		const pod = podsBySandboxId.get(currentSandbox.id)

		if (pod) {
			await reconcileSandboxWithPod(currentSandbox, pod)
		} else {
			await reconcileMissingPod(currentSandbox)
		}
	}

	const activeSandboxIds = new Set(activeSandboxes.map((row) => row.id))

	for (const [sandboxId, pod] of podsBySandboxId) {
		if (activeSandboxIds.has(sandboxId) || !pod.metadata?.name) continue

		// Crash-safety net: the pod has no live sandbox row (row already
		// terminal, or deleted out-of-band), so remove it from the cluster.
		console.log(`sandbox reconciler: deleting orphan pod ${pod.metadata.name}`)
		await deleteSandboxPod(pod.metadata.name, { force: true })
	}

	// Same net for per-sandbox env secrets left behind by crashes.
	for (const secret of await listSandboxSecrets()) {
		const sandboxId = secret.metadata?.labels?.[SANDBOX_ID_LABEL]
		if (!secret.metadata?.name || (sandboxId && activeSandboxIds.has(sandboxId))) continue

		console.log(`sandbox reconciler: deleting orphan secret ${secret.metadata.name}`)
		await deleteSandboxSecret(secret.metadata.name)
	}
}

type SandboxRow = typeof sandbox.$inferSelect

async function reconcileSandboxWithPod(currentSandbox: SandboxRow, pod: V1Pod) {
	const derived = derivePodState(pod)

	if (derived.status === "unknown") return
	if (derived.status === currentSandbox.status && derived.reason === currentSandbox.statusReason) {
		return
	}

	const now = new Date()
	const isTerminal = derived.status === "stopped" || derived.status === "failed"

	await updateGuarded(currentSandbox, {
		finishedAt: isTerminal ? (currentSandbox.finishedAt ?? now) : null,
		startedAt:
			currentSandbox.startedAt ?? (derived.status === "running" || isTerminal ? now : null),
		status: derived.status,
		statusReason: derived.reason,
	})
}

async function reconcileMissingPod(currentSandbox: SandboxRow) {
	const now = new Date()

	if (currentSandbox.status === "stopping") {
		await updateGuarded(currentSandbox, {
			finishedAt: currentSandbox.finishedAt ?? now,
			status: "stopped",
			statusReason: null,
		})
		return
	}

	// A just-created row may not have a visible pod yet; give it a grace
	// window before declaring the pod lost.
	const graceWindowMs = Math.max(15_000, 3 * env.SANDBOX_RECONCILE_INTERVAL_MS)

	if (
		currentSandbox.status === "starting" &&
		now.getTime() - currentSandbox.createdAt.getTime() < graceWindowMs
	) {
		return
	}

	await updateGuarded(currentSandbox, {
		finishedAt: currentSandbox.finishedAt ?? now,
		status: "failed",
		statusReason: "pod not found",
	})
}

// Optimistic concurrency: only apply when the status is still what we read,
// so concurrent stop/kill handlers win and the reconciler retries next tick.
async function updateGuarded(
	currentSandbox: SandboxRow,
	values: Partial<typeof sandbox.$inferInsert>,
) {
	await db
		.update(sandbox)
		.set(values)
		.where(and(eq(sandbox.id, currentSandbox.id), eq(sandbox.status, currentSandbox.status)))
}
