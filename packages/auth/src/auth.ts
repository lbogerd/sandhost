import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, organization } from "better-auth/plugins"
import { apiKey } from "@better-auth/api-key"
import { db } from "@wtrn/db"
import * as schema from "@wtrn/db-schema"

export const auth = ({
	betterAuthUrl,
	betterAuthSecret,
	trustedOrigins = ["http://localhost:3000"],
}: {
	betterAuthUrl: string
	betterAuthSecret: string
	trustedOrigins?: string[]
}) =>
	betterAuth({
		baseURL: betterAuthUrl,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			admin(),
			organization(),
			apiKey({
				apiKeyHeaders: "x-runner-api-key",
				configId: "runner",
				enableMetadata: true,
				permissions: {
					defaultPermissions: {
						runner: ["heartbeat", "sandbox:event"],
					},
				},
				rateLimit: {
					enabled: false,
				},
				defaultPrefix: "runner_",
			}),
		],
		rateLimit: {
			enabled: false,
		},
		secret: betterAuthSecret,
		trustedOrigins,
	})
