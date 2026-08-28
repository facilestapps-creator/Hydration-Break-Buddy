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

  // Read-only pre-checks outside the transaction to keep the critical section short.
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  // Generate a candidate invite code before entering the transaction.
  // If there is a uniqueness collision at insert time the DB constraint will
  // reject the insert; the transaction rolls back, returning the payment token
  // to an unconsumed state — the user can retry and will get a new code.
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const existing = await db.select({ id: teamsTable.id }).from(teamsTable).where(eq(teamsTable.inviteCode, inviteCode));
    if (existing.length === 0) break;
    inviteCode = generateInviteCode();
  }

  // ── Free-launch mode: skip payment entirely ─────────────────────────────
  const freeModeActive =
    !!process.env.LAUNCH_FREE_UNTIL &&
    Date.now() < new Date(process.env.LAUNCH_FREE_UNTIL).getTime();

  // ── Single transaction: claim the payment AND create the team ──────────
  // If anything after the claim fails, the transaction rolls back and the
  // payment is NOT marked consumed — the user keeps the ability to retry.
  let team: typeof teamsTable.$inferSelect;
  let paymentPlan: "team" | "company";

  if (freeModeActive) {
    // In free mode, plan is required in the body; paymentToken is ignored.
    const plan = parsed.data.plan as "team" | "company" | undefined;
    if (!plan) {
      res.status(400).json({ error: "plan is required when free launch mode is active" });
      return;
    }

    const memberLimit = plan === "company" ? null : 10;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    try {
      const result = await db.transaction(async (tx) => {
        const [createdTeam] = await tx
          .insert(teamsTable)
          .values({
            name: parsed.data.name,
            inviteCode,
            plan,
            memberLimit,
            subscriptionStatus: "active",
            currentPeriodEnd,
            mpPreapprovalId: null,
            creatorUserId: userId,
          })
          .returning();

        await tx.update(usersTable).set({ teamId: createdTeam.id }).where(eq(usersTable.id, userId));

        return { team: createdTeam, paymentPlan: plan };
      });

      team = result.team;
      paymentPlan = result.paymentPlan;
    } catch (err: unknown) {
      throw err;
    }
  } else {
    // ── Paid flow: paymentToken is required ─────────────────────────────
    if (!parsed.data.paymentToken) {
      res.status(400).json({ error: "paymentToken is required" });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        // Claim the payment token atomically
        const claimed = await tx
          .update(paymentsTable)
          .set({ consumed: true, updatedAt: new Date() })
          .where(
            and(
              eq(paymentsTable.paymentToken, parsed.data.paymentToken!),
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
          // Log the actual DB state of this token so we can diagnose race conditions.
          const currentState = await tx
            .select({ status: paymentsTable.status, consumed: paymentsTable.consumed, userId: paymentsTable.userId })
            .from(paymentsTable)
            .where(eq(paymentsTable.paymentToken, parsed.data.paymentToken!));
          console.warn(
            "[teams/create] PAYMENT_NOT_CLAIMABLE token=%s requestingUserId=%s dbState=%j",
            parsed.data.paymentToken,
            userId,
            currentState[0] ?? null,
          );
          // Throwing inside a transaction causes an automatic rollback.
          throw Object.assign(new Error("PAYMENT_NOT_CLAIMABLE"), { isPaymentError: true });
        }

        const plan = (claimed[0].plan ?? "team") as "team" | "company";
        const mpPreapprovalId = claimed[0].mpPreapprovalId ?? null;
        const memberLimit = plan === "company" ? null : 10;

        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        const [createdTeam] = await tx
          .insert(teamsTable)
          .values({
            name: parsed.data.name,
            inviteCode,
            plan,
            memberLimit,
            subscriptionStatus: "active",
            currentPeriodEnd,
            mpPreapprovalId,
            creatorUserId: userId,
          })
          .returning();
    

        // Add the creator to the team within the same transaction
        await tx.update(usersTable).set({ teamId: createdTeam.id }).where(eq(usersTable.id, userId));

        return { team: createdTeam, paymentPlan: plan };
      });

      team = result.team;
      paymentPlan = result.paymentPlan;
    } catch (err: unknown) {
      if (err instanceof Error && (err as { isPaymentError?: boolean }).isPaymentError) {
        res.status(402).json({ error: "Payment not found, not approved, already used, or belongs to a different user" });
        return;
      }
      throw err; // unexpected DB error — propagate to global handler
    }
  }

  res.status(201).json(CreateTeamResponse.parse({
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    createdAt: team.createdAt.toISOString(),
    memberCount: 1,
    plan: paymentPlan,
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
      let fullMessage = `Este equipo llegó al límite de ${team.memberLimit} miembros. Actualizá a plan empresa para sumar más.`;
      if (team.creatorUserId) {
        const creatorRows = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, team.creatorUserId));
        if (creatorRows.length > 0) {
          fullMessage = `Este equipo está lleno. Avisale a ${creatorRows[0].name} que no hay más lugares disponibles.`;
        }
      }
      res.status(403).json({ error: fullMessage });
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

router.get("/teams/:teamId", requireAuth, async (req, res): Promise<void> => {
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

  // Verificar que quien pregunta sea miembro de este equipo antes de exponer sus datos (incluye inviteCode)
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (userRows.length === 0 || userRows[0].teamId !== teamId) {
    res.status(403).json({ error: "Not a member of this team" });
    return;
  }

  const team = teamRows[0];
    const memberCount = await getTeamMemberCount(teamId);
  const nearMemberLimit = team.plan === "team" && team.memberLimit !== null && memberCount >= team.memberLimit - 1;

  const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
  const graceExpiresAt =
    team.subscriptionStatus === "paused" && team.pastDueSince
      ? new Date(team.pastDueSince.getTime() + GRACE_PERIOD_MS).toISOString()
      : null;

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
    graceExpiresAt,
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
