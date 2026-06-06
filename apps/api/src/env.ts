import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import * as z from "zod"

config({ path: new URL("../.env", import.meta.url), quiet: true })

export const env = createEnv({
	server: {
		BETTER_AUTH_SECRET: z.string().min(1),
		BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
		PORT: z
			.string()
			.transform((val) => parseInt(val, 10))
			.pipe(z.number())
			.default(4000),
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
