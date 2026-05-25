import { uuid, pgTable, varchar } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
	id: uuid().primaryKey().defaultRandom(),
	username: varchar("username", { length: 256 }).notNull(),
})

export const teamsTable = pgTable("teams", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar("name", { length: 256 }).notNull(),
	ownerId: uuid("owner_id")
		.notNull()
		.references(() => usersTable.id),
})

export const runnersTable = pgTable("runners", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar("name", { length: 256 }).notNull(),
})

export const sandboxBlueprintsTable = pgTable("sandbox_blueprints", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar("name", { length: 256 }).notNull(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teamsTable.id),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => usersTable.id),
})
