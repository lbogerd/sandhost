import { relations } from "drizzle-orm"
import {
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core"

export * from "drizzle-orm"

const timestampTz = (
	name: string,
	options: Parameters<typeof timestamp>[1] = {
		precision: 6,
		withTimezone: true,
	},
) => timestamp(name, options)

const updatedAt = timestampTz("updated_at")
	.defaultNow()
	.$onUpdate(() => /* @__PURE__ */ new Date())
	.notNull()
const createdAt = timestampTz("created_at").defaultNow().notNull()
const expiresAt = timestampTz("expires_at").notNull()

export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: varchar("slug", { length: 255 }).notNull().unique(),
	logo: text("logo"),
	metadata: text("metadata"),
	createdAt,
})

export const member = pgTable(
	"member",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		createdAt,
	},
	(table) => [
		index("member_userId_idx").on(table.userId),
		index("member_organizationId_idx").on(table.organizationId),
	],
)

export const invitation = pgTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		role: text("role"),
		status: text("status").notNull(),
		createdAt,
		expiresAt,
	},
	(table) => [
		index("invitation_email_idx").on(table.email),
		index("invitation_organizationId_idx").on(table.organizationId),
	],
)

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	role: text("role"),
	banned: boolean("banned"),
	banReason: text("ban_reason"),
	banExpires: timestampTz("ban_expires"),
	createdAt,
	updatedAt,
})

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt,
		token: text("token").notNull().unique(),
		createdAt,
		updatedAt,
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		activeOrganizationId: text("active_organization_id"),
		activeTeamId: text("active_team_id"),
		impersonatedBy: text("impersonated_by"),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
)

export const organizationRole = pgTable(
	"organization_role",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		permission: text("permission").notNull(),
		createdAt,
		updatedAt,
	},
	(table) => [index("organizationRole_organizationId_idx").on(table.organizationId)],
)

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestampTz("access_token_expires_at"),
		refreshTokenExpiresAt: timestampTz("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt,
		updatedAt,
	},
	(table) => [index("account_userId_idx").on(table.userId)],
)

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt,
		createdAt,
		updatedAt,
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
)

export const apikey = pgTable(
	"apikey",
	{
		id: text("id").primaryKey(),
		configId: text("config_id").notNull().default("default"),
		name: text("name"),
		start: text("start"),
		prefix: text("prefix"),
		key: text("key").notNull(),
		referenceId: text("reference_id").notNull(),
		refillInterval: integer("refill_interval"),
		refillAmount: integer("refill_amount"),
		lastRefillAt: timestampTz("last_refill_at"),
		enabled: boolean("enabled").default(true),
		rateLimitEnabled: boolean("rate_limit_enabled").default(true),
		rateLimitTimeWindow: integer("rate_limit_time_window"),
		rateLimitMax: integer("rate_limit_max"),
		requestCount: integer("request_count"),
		remaining: integer("remaining"),
		lastRequest: timestampTz("last_request"),
		expiresAt: timestampTz("expires_at"),
		createdAt,
		updatedAt,
		permissions: text("permissions"),
		metadata: text("metadata"),
	},
	(table) => [
		index("apikey_configId_idx").on(table.configId),
		index("apikey_referenceId_idx").on(table.referenceId),
	],
)

export const runner = pgTable("runner", {
	id: text("id").primaryKey(),
	name: text("name"),
	hostname: text("hostname").notNull(),
	status: text("status").notNull().default("online"),
	lastSeenAt: timestampTz("last_seen_at").notNull(),
	createdAt,
	updatedAt,
})

export const runnerHeartbeat = pgTable(
	"runner_heartbeat",
	{
		id: text("id").primaryKey(),
		runnerId: text("runner_id")
			.notNull()
			.references(() => runner.id, { onDelete: "cascade" }),
		cpuUsagePercent: doublePrecision("cpu_usage_percent").notNull(),
		memoryFreeBytes: doublePrecision("memory_free_bytes").notNull(),
		memoryTotalBytes: doublePrecision("memory_total_bytes").notNull(),
		runningSandboxCount: integer("running_sandbox_count").notNull(),
		reportedAt: timestampTz("reported_at").notNull(),
	},
	(table) => [index("runnerHeartbeat_runnerId_idx").on(table.runnerId)],
)

export const runnerCommand = pgTable(
	"runner_command",
	{
		id: text("id").primaryKey(),
		runnerId: text("runner_id")
			.notNull()
			.references(() => runner.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		payload: jsonb("payload").notNull(),
		status: text("status").notNull().default("pending"),
		createdAt,
		claimedAt: timestampTz("claimed_at"),
		completedAt: timestampTz("completed_at"),
	},
	(table) => [
		index("runnerCommand_runnerId_idx").on(table.runnerId),
		index("runnerCommand_status_idx").on(table.status),
	],
)

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
}))

export const memberRelations = relations(member, ({ one }) => ({
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}))

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}))

export const runnerRelations = relations(runner, ({ many }) => ({
	heartbeats: many(runnerHeartbeat),
	commands: many(runnerCommand),
}))

export const runnerHeartbeatRelations = relations(runnerHeartbeat, ({ one }) => ({
	runner: one(runner, {
		fields: [runnerHeartbeat.runnerId],
		references: [runner.id],
	}),
}))

export const runnerCommandRelations = relations(runnerCommand, ({ one }) => ({
	runner: one(runner, {
		fields: [runnerCommand.runnerId],
		references: [runner.id],
	}),
}))

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}))
