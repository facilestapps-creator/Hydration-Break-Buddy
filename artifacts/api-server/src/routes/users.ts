import { Router, type IRouter } from "express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, usersTable, teamsTable, breakEntriesTable } from "@workspace/db";
import {
  CreateUserBody,
  CreateUserResponse,
  GetUserParams,
  GetUserResponse,
  GetUserStatsParams,
  GetUserStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ name: parsed.data.name })
    .returning();

  res.status(201).json(CreateUserResponse.parse({
    id: user.id,
    name: user.name,
    teamId: user.teamId ?? null,
    teamName: null,
    createdAt: user.createdAt.toISOString(),
  }));
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      teamId: usersTable.teamId,
      teamName: teamsTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(teamsTable, eq(usersTable.teamId, teamsTable.id))
    .where(eq(usersTable.id, userId));

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const u = rows[0];
  res.json(GetUserResponse.parse({
    id: u.id,
    name: u.name,
    teamId: u.teamId ?? null,
    teamName: u.teamName ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
});

router.get("/users/:userId/stats", async (req, res): Promise<void> => {
  const params = GetUserStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  const day = weekStart.getDay(); // 0=Sun
  weekStart.setDate(weekStart.getDate() - ((day === 0 ? 7 : day) - 1)); // Mon

  const entries = await db
    .select()
    .from(breakEntriesTable)
    .where(
      and(
        eq(breakEntriesTable.userId, userId),
        gte(breakEntriesTable.completedAt, weekStart)
      )
    );

  const todayEntries = entries.filter(e => e.completedAt >= todayStart);

  const stats = {
    userId,
    todayBreaks: todayEntries.length,
    weeklyBreaks: entries.length,
    todayHydration: todayEntries.filter(e => e.breakType === "hydration").length,
    weeklyHydration: entries.filter(e => e.breakType === "hydration").length,
  };

  res.json(GetUserStatsResponse.parse(stats));
});

export default router;
