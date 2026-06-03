import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "@wtrn/db"

export const auth = ({
	betterAuthUrl,
	betterAuthSecret,
}: {
	betterAuthUrl: string
	betterAuthSecret: string
}) =>
	betterAuth({
		baseURL: betterAuthUrl,
		database: drizzleAdapter(db, {
			provider: "pg",
		}),
		secret: betterAuthSecret,
		plugins: [organization()],
	})
