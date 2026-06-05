import { createFileRoute } from "@tanstack/react-router"
import { apiClient } from "@wtrn/api-client"
import type { FormEvent } from "react"
import { useState } from "react"

export const Route = createFileRoute("/")({
	component: Index,
})

function Index() {
	const [name, setName] = useState("oRPC")
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	async function callHelloProcedure(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await apiClient.hello({ name })
			setMessage(result.message)
		} catch (error) {
			setMessage(null)
			setError(error instanceof Error ? error.message : "Failed to call procedure")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-5 p-6">
			<div>
				<h1 className="text-2xl font-semibold">oRPC hello</h1>
				<p className="mt-1 text-sm text-neutral-600">
					Call the example procedure from the API server.
				</p>
			</div>

			<form className="flex flex-col gap-3" onSubmit={callHelloProcedure}>
				<label className="flex flex-col gap-1 text-sm font-medium">
					Name
					<input
						className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="World"
					/>
				</label>

				<button
					className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isLoading}
					type="submit"
				>
					{isLoading ? "Calling..." : "Call hello"}
				</button>
			</form>

			<div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
				<div className="font-medium text-neutral-700">Result</div>
				<div className="mt-2 text-neutral-950">{message ?? error ?? "No response yet."}</div>
			</div>
		</div>
	)
}
