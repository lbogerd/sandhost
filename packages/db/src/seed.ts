import { db } from "./db-client.ts"
import { runnersTable, sandboxBlueprintsTable, teamsTable, usersTable } from "@wtrn/db-schema"

async function main() {
	const fakeUser = await db
		.insert(usersTable)
		.values({
			username: "fake_user",
		})
		.returning()
	console.log("Fake user created:", JSON.stringify(fakeUser, null, 2))

	const fakeTeam = await db
		.insert(teamsTable)
		.values({
			name: "team_fake",
			ownerId: fakeUser[0].id,
		})
		.returning()
	console.log("Fake team created:", JSON.stringify(fakeTeam, null, 2))

	const fakeRunner = await db
		.insert(runnersTable)
		.values({
			name: "fake_runner",
		})
		.returning()
	console.log("Fake runner created:", JSON.stringify(fakeRunner, null, 2))

	const fakeSandboxBlueprint = await db
		.insert(sandboxBlueprintsTable)
		.values({
			name: "fake_sandbox_blueprint",
			teamId: fakeTeam[0].id,
			createdBy: fakeUser[0].id,
		})
		.returning()
	console.log("Fake sandbox blueprint created:", JSON.stringify(fakeSandboxBlueprint, null, 2))
}

main()
