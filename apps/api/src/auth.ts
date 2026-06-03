import { env } from "./env.ts"
import { auth as authModule } from "@wtrn/auth"

export const auth = authModule({
	betterAuthSecret: env.BETTER_AUTH_SECRET,
	betterAuthUrl: env.BETTER_AUTH_URL,
})
