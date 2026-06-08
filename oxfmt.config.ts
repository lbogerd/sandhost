import { defineConfig } from "oxfmt"

export default defineConfig({
	useTabs: true,
	semi: false,
	ignorePatterns: ["dist", "node_modules", "routeTree.gen.ts"],
})
