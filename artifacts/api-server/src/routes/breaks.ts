import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, breakEntriesTable } from "@workspace/db";
import { LogBreakBody, LogBreakResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { relaxedLimiter } from "../lib/rate-limiters";

const VALID_BREAK_TYPES = ["hydration", "walk", "eye"] as const;

const router: IRouter = Router();

router.post("/breaks", requireAuth, relaxedLimiter, async (req, res): Promise<void> => {
  const parsed = LogBreakBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { breakType } = parsed.data;
  const userId = req.userId; // set by requireAuth middleware

  if (!VALID_BREAK_TYPES.includes(breakType as typeof VALID_BREAK_TYPES[number])) {
    res.status(400).json({ error: "Invalid breakType. Must be hydration, walk, or eye" });
    return;
  }

  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const [entry] = await db
    .insert(breakEntriesTable)
    .values({ userId, breakType })
    .returning();

  res.status(201).json(LogBreakResponse.parse({
    id: entry.id,
    userId: entry.userId,
    breakType: entry.breakType,
    completedAt: entry.completedAt.toISOString(),
  }));
});

export default router;
