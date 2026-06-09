import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import * as z from "zod"

config({ path: new URL("../.env", import.meta.url), quiet: true })

export const env = createEnv({
	server: {
		BETTER_AUTH_SECRET: z.string().min(1),
		BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
		KUBE_CONTEXT: z.string().min(1).optional(),
		PORT: z
			.string()
			.transform((val) => parseInt(val, 10))
			.pipe(z.number())
			.default(4000),
		SANDBOX_CPU_LIMIT: z.string().min(1).default("250m"),
		SANDBOX_CPU_REQUEST: z.string().min(1).default("50m"),
		SANDBOX_DEFAULT_IMAGE: z.string().min(1).default("busybox:1.37"),
		SANDBOX_MEMORY_LIMIT: z.string().min(1).default("256Mi"),
		SANDBOX_MEMORY_REQUEST: z.string().min(1).default("64Mi"),
		SANDBOX_NAMESPACE: z.string().min(1).default("sandhost"),
		SANDBOX_RECONCILE_INTERVAL_MS: z.coerce.number().int().min(500).default(4000),
		TRUSTED_ORIGINS: z
			.string()
			.default("http://localhost:3000")
			.transform((value) =>
				value
					.split(",")
					.map((origin) => origin.trim())
					.filter(Boolean),
			)
			.pipe(z.array(z.url()).min(1)),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
})
