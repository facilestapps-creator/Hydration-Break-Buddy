import { Router, type IRouter } from "express";
import { eq, and, gte, inArray, count } from "drizzle-orm";
import { db, usersTable, teamsTable, breakEntriesTable, paymentsTable } from "@workspace/db";
import {
  CreateTeamBody,
  CreateTeamResponse,
  JoinTeamBody,
  JoinTeamResponse,
  GetTeamParams,
  GetTeamResponse,
  GetTeamLeaderboardParams,
  GetTeamLeaderboardResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getWeekStart(): Date {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = todayStart.getDay();
  todayStart.setDate(todayStart.getDate() - ((day === 0 ? 7 : day) - 1));
  return todayStart;
}

async function getTeamMemberCount(teamId: number): Promise<number> {
  const rows = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(eq(usersTable.teamId, teamId));
  return Number(rows[0]?.cnt ?? 0);
}

router.post("/teams", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userId;

  // Atomically claim the payment token — prevents reuse and enforces user binding
  const claimed = await db
    .update(paymentsTable)
    .set({ consumed: true, updatedAt: new Date() })
    .where(
      and(
        eq(paymentsTable.paymentToken, parsed.data.paymentToken),
        eq(paymentsTable.status, "approved"),
        eq(paymentsTable.userId, userId),
        eq(paymentsTable.consumed, false),
      )
    )
    .returning({
      id: paymentsTable.id,
      plan: paymentsTable.plan,
      mpPreapprovalId: paymentsTable.mpPreapprovalId,
    });

  if (claimed.length === 0) {
    res.status(402).json({ error: "Payment not found, not approved, already used, or belongs to a different user" });
    return;
  }

  const paymentPlan = (claimed[0].plan ?? "team") as "team" | "company";
  const mpPreapprovalId = claimed[0].mpPreapprovalId ?? null;
  const memberLimit = paymentPlan === "company" ? null : 10;

  // Verify user exists
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.select().from(teamsTable).where(eq(teamsTable.inviteCode, inviteCode));
    if (existing.length === 0) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  // Set subscription period: now + 1 month
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  const [team] = await db
    .insert(teamsTable)
    .values({
      name: parsed.data.name,
      inviteCode,
      plan: paymentPlan,
      memberLimit,
      subscriptionStatus: "active",
      currentPeriodEnd,
      mpPreapprovalId,
    })
    .returning();

  // Add the creator to the team
  await db.update(usersTable).set({ teamId: team.id }).where(eq(usersTable.id, userId));

  res.status(201).json(CreateTeamResponse.parse({
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    createdAt: team.createdAt.toISOString(),
    memberCount: 1,
    plan: team.plan,
    subscriptionStatus: team.subscriptionStatus,
    logoUrl: team.logoUrl ?? null,
    nearMemberLimit: false,
  }));
});

router.post("/teams/join", requireAuth, async (req, res): Promise<void> => {
  const parsed = JoinTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const teamRows = await db.select().from(teamsTable).where(eq(teamsTable.inviteCode, parsed.data.inviteCode.toUpperCase()));
  if (teamRows.length === 0) {
    res.status(404).json({ error: "Team not found — check the invite code" });
    return;
  }

  const team = teamRows[0];
  const userId = req.userId;

  // Verify user exists
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  // Check member limit for team plan
  if (team.plan === "team" && team.memberLimit !== null) {
    const currentCount = await getTeamMemberCount(team.id);
    if (currentCount >= team.memberLimit) {
      res.status(403).json({
        error: `Este equipo llegó al límite de ${team.memberLimit} miembros. Actualizá a plan empresa para sumar más.`,
      });
      return;
    }
  }

  await db.update(usersTable).set({ teamId: team.id }).where(eq(usersTable.id, userId));

  const memberCount = await getTeamMemberCount(team.id);

  res.json(JoinTeamResponse.parse({
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    createdAt: team.createdAt.toISOString(),
    memberCount,
    plan: team.plan,
    subscriptionStatus: team.subscriptionStatus,
    logoUrl: team.logoUrl ?? null,
    nearMemberLimit: team.plan === "team" && team.memberLimit !== null && memberCount >= team.memberLimit - 1,
  }));
});

router.get("/teams/:teamId", async (req, res): Promise<void> => {
  const params = GetTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const raw = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId;
  const teamId = parseInt(raw, 10);

  const teamRows = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (teamRows.length === 0) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  const team = teamRows[0];
  const memberCount = await getTeamMemberCount(teamId);
  const nearMemberLimit = team.plan === "team" && team.memberLimit !== null && memberCount >= team.memberLimit - 1;

  res.json(GetTeamResponse.parse({
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    createdAt: team.createdAt.toISOString(),
    memberCount,
    plan: team.plan,
    subscriptionStatus: team.subscriptionStatus,
    logoUrl: team.logoUrl ?? null,
    nearMemberLimit,
  }));
});

router.patch("/teams/:teamId/logo", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId;
  const teamId = parseInt(raw, 10);
  if (isNaN(teamId)) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }

  const { logoUrl } = req.body as { logoUrl?: string };

  // Validate URL format: must end in a supported image extension
  if (typeof logoUrl !== "string" || !/\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(logoUrl)) {
    res.status(400).json({ error: "Invalid logo URL. Must end in .png, .jpg, .jpeg, or .webp" });
    return;
  }
  try { new URL(logoUrl); } catch {
    res.status(400).json({ error: "Invalid logo URL format" });
    return;
  }

  const teamRows = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (teamRows.length === 0) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  if (teamRows[0].plan !== "company") {
    res.status(403).json({ error: "Custom logo is only available on the Company plan" });
    return;
  }

  // Verify user is a member of this team
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (userRows.length === 0 || userRows[0].teamId !== teamId) {
    res.status(403).json({ error: "Not a member of this team" });
    return;
  }

  await db.update(teamsTable).set({ logoUrl }).where(eq(teamsTable.id, teamId));
  res.json({ logoUrl });
});

router.get("/teams/:teamId/leaderboard", requireAuth, async (req, res): Promise<void> => {
  const params = GetTeamLeaderboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const raw = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId;
  const teamId = parseInt(raw, 10);

  const teamRows = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (teamRows.length === 0) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  const team = teamRows[0];
  const weekStart = getWeekStart();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const members = await db.select().from(usersTable).where(eq(usersTable.teamId, teamId));

  if (members.length === 0) {
    res.json(GetTeamLeaderboardResponse.parse({
      teamId,
      teamName: team.name,
      weekStart: weekStart.toISOString(),
      logoUrl: team.logoUrl ?? null,
      members: [],
    }));
    return;
  }

  const memberIds = members.map(m => m.id);

  const weekEntries = await db
    .select()
    .from(breakEntriesTable)
    .where(
      and(
        inArray(breakEntriesTable.userId, memberIds),
        gte(breakEntriesTable.completedAt, weekStart)
      )
    );

  const memberStats = members.map(member => {
    const userEntries = weekEntries.filter(e => e.userId === member.id);
    const todayEntries = userEntries.filter(e => e.completedAt >= todayStart);
    return {
      userId: member.id,
      name: member.name,
      weeklyBreaks: userEntries.length,
      todayBreaks: todayEntries.length,
      weeklyHydration: userEntries.filter(e => e.breakType === "hydration").length,
    };
  });

  memberStats.sort((a, b) => b.weeklyBreaks - a.weeklyBreaks || a.name.localeCompare(b.name));

  const MEDALS: Record<number, string> = { 1: "gold", 2: "silver", 3: "bronze" };
  const ranked = memberStats.map((m, i) => ({
    ...m,
    rank: i + 1,
    medal: MEDALS[i + 1] ?? null,
  }));

  res.json(GetTeamLeaderboardResponse.parse({
    teamId,
    teamName: team.name,
    weekStart: weekStart.toISOString(),
    logoUrl: team.logoUrl ?? null,
    members: ranked,
  }));
});

export default router;
