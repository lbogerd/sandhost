import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { auth } from "./auth.ts"
import { env } from "./env.ts"
import { cors } from "hono/cors"

const app = new Hono()

app.use("/api/*", cors({
		origin: "http://localhost:4000", // replace with your origin
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	})
)

app.get("/", (c) => {
	return c.text("Hello Hono!")
})

app.post("/api/create-test-user", async (c) => {
	const password = Math.random().toString(36).slice(-8)

	try {
		const user = await auth.api.signUpEmail({
			body: {
				name: `Test User ${Date.now()}`,
				email: `testuser-${Date.now()}@example.com`,
				password,
			},
		})

		return c.json({ ok: true, password, user })
	} catch (error) {
		console.error("Error creating test user:", error)
		return c.json({ ok: false, message: "Failed to create user", error }, 500)
	}
})

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

app.get("/api/session-test", async (c) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	})

	if (!session) {
		return c.json(
			{
				ok: false,
				message: "Unauthorized",
			},
			401,
		)
	}

	return c.json({
		ok: true,
		message: "Authenticated request",
		session,
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
