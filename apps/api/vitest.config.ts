import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		hookTimeout: 60_000,
		include: ["test/**/*.test.ts"],
		testTimeout: 240_000,
	},
})
