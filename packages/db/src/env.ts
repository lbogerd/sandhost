import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import * as z from "zod"

config({ path: new URL("../.env", import.meta.url), quiet: true })

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
})
