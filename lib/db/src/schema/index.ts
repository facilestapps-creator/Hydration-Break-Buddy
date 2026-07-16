import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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
  mpPreapprovalId: text("mp_preapproval_id"),                     // subscription ID from MP
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

// Payments table (Mercado Pago)
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentToken: text("payment_token").notNull().unique(),   // our UUID, used as external_reference
  mpPreferenceId: text("mp_preference_id"),                 // nullable — used only for one-time preference flow
  mpPaymentId: text("mp_payment_id"),                       // filled in by webhook (one-time payment)
  mpPreapprovalId: text("mp_preapproval_id"),               // subscription preapproval ID from MP
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),      // pending | approved | rejected | cancelled
  plan: text("plan").notNull().default("team"),             // "team" | "company"
  amountArs: integer("amount_ars").notNull().default(0),    // 0 for subscription plans (price from MP)
  consumed: boolean("consumed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

// Sessions table (server-side session tokens for auth)
export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
