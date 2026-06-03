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

app.post("/create-test-user", async (c) => {
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

app.post("/login-test", async (c) => {
	const { email, password } = await c.req.json()

	if (!email) {
		return c.json({ ok: false, message: "Email is required" }, 400)
	}

	try {
		const session = await auth.api.signInEmail({
			body: { email, password },
		})

		if (!session) {
			return c.json({ ok: false, message: "Invalid credentials" }, 401)
		}

		return c.json({ ok: true, message: "Login successful", session })
	} catch (error) {
		console.error("Error during login:", error)
		return c.json({ ok: false, message: "Login failed", error }, 500)
	}
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
