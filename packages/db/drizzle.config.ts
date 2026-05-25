import { defineConfig } from "drizzle-kit"
import { env } from "./src/env.ts"

export default defineConfig({
	schema: "../db-schema/src/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
})
