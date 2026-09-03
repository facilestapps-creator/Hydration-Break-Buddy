import { pgTable, serial, text, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Teams table
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  plan: text("plan").notNull().default("team"),                   // "team" | "company"
  memberLimit: integer("member_limit").default(10),               // null = unlimited (company plan)
  logoUrl: text("logo_url"),                                      // nullable, company plan only
  subscriptionStatus: text("subscription_status").notNull().default("active"), // pending | active | paused | cancelled | past_due
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }), // nullable
  pastDueSince: timestamp("past_due_since", { withTimezone: true }),        // nullable — set when a payment first fails, cleared on success. Used for the 24h grace window.
  mpPreapprovalId: text("mp_preapproval_id"),                     // subscription ID from MP
  lsSubscriptionId: text("ls_subscription_id"),                   // subscription ID from Lemon Squeezy
  creatorUserId: integer("creator_user_id"),                      // nullable — who created the team, for display purposes only (no special permissions attached)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;

// Users table
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamId: integer("team_id").references(() => teamsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// Break entries table
export const breakEntriesTable = pgTable("break_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  breakType: text("break_type").notNull(), // "hydration" | "walk" | "eye"
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBreakEntrySchema = createInsertSchema(breakEntriesTable).omit({ id: true, completedAt: true });
export type InsertBreakEntry = z.infer<typeof insertBreakEntrySchema>;
export type BreakEntry = typeof breakEntriesTable.$inferSelect;

// Payments table
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentToken: text("payment_token").notNull().unique(),   // our UUID, used as external_reference
  mpPreferenceId: text("mp_preference_id"),                 // nullable — used only for one-time preference flow
  mpPaymentId: text("mp_payment_id"),                       // filled in by webhook (one-time payment)
  mpPreapprovalId: text("mp_preapproval_id"),               // subscription preapproval ID from MP
  provider: text("provider").notNull().default("mercadopago"),   // "mercadopago" | "lemonsqueezy"
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),      // pending | approved | rejected | cancelled
  plan: text("plan").notNull().default("team"),             // "team" | "company"
  amount: integer("amount").notNull().default(0),           // price in smallest currency unit; 0 for subscription plans
  currency: text("currency").notNull().default("ARS"),      // "ARS" | "USD" | etc.
  consumed: boolean("consumed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

// Analytics sessions table (internal visit tracking)
export const analyticsSessionsTable = pgTable("analytics_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  ipHash: text("ip_hash").notNull(),
  userAgent: text("user_agent"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  pingCount: integer("ping_count").notNull().default(1),
});

export type AnalyticsSession = typeof analyticsSessionsTable.$inferSelect;

// Processed webhook events (idempotency guard — MP can retry/duplicate notifications)
export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEventsTable.$inferSelect;

// Sessions table (server-side session tokens for auth)
export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
