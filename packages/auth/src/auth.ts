import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, organization } from "better-auth/plugins"
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
		plugins: [admin(), organization()],
		rateLimit: {
			enabled: false,
		},
		secret: betterAuthSecret,
		trustedOrigins,
	})
