import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Teams table
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
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
  mpPreferenceId: text("mp_preference_id").notNull(),
  mpPaymentId: text("mp_payment_id"),                       // filled in by webhook
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),      // pending | approved | rejected | cancelled
  amountArs: integer("amount_ars").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
