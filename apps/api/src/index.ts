import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { auth } from "./auth.ts"
import { env } from "./env.ts"

const app = new Hono()

app.get("/", (c) => {
	return c.text("Hello Hono!")
})

app.get("/auth-test", async (c) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers })

	if (!session) {
		return c.json({ ok: false, message: "Unauthorized" }, 401)
	}

	return c.json({
		ok: true,
		message: "auth-test route works",
		user: session.user,
	})
})

serve(
	{
		fetch: app.fetch,
		port: env.PORT,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`)
	},
)
