import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import { hostname } from "node:os"
import * as z from "zod"

config({ path: new URL("../.env", import.meta.url), quiet: true })

export const env = createEnv({
	server: {
		API_RPC_URL: z.url().default("http://localhost:4000/rpc"),
		HEARTBEAT_INTERVAL_MS: z
			.string()
			.transform((val) => parseInt(val, 10))
			.pipe(z.number().positive())
			.default(5000),
		RUNNER_API_KEY: z.string().min(1),
		RUNNER_ID: z.string().min(1),
	},
	runtimeEnv: {
		...process.env,
		RUNNER_ID: process.env.RUNNER_ID || hostname(),
	},
	emptyStringAsUndefined: true,
})
