import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash, randomBytes } from "crypto";
import request from "supertest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  teamsTable,
  sessionsTable,
  webhookEventsTable,
  breakEntriesTable,
} from "@workspace/db";
import app from "../app";

// ── Test fixtures ──────────────────────────────────────────────────────────
// Everything created here is cleaned up in afterAll. This suite runs against
// a real database — NEVER point DATABASE_URL at production when running it.

const userIds: number[] = [];
const teamIds: number[] = [];
const sessionIds: number[] = [];

async function createUser(name: string): Promise<number> {
  const [user] = await db.insert(usersTable).values({ name }).returning();
  userIds.push(user.id);
  return user.id;
}

async function createSessionCookie(userId: number): Promise<string> {
  const raw = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const [session] = await db.insert(sessionsTable).values({ userId, tokenHash }).returning();
  sessionIds.push(session.id);
  return `bb_session=${raw}`;
}

async function createTeam(overrides: Partial<typeof teamsTable.$inferInsert> & { inviteCode: string }): Promise<number> {
  const [team] = await db
    .insert(teamsTable)
    .values({
      name: "Test Team",
      plan: "team",
      memberLimit: 10,
      subscriptionStatus: "active",
      ...overrides,
    })
    .returning();
  teamIds.push(team.id);
  return team.id;
}

let teamA: number, teamB: number, teamFull: number, teamGrace: number, teamExpired: number, teamCancelled: number;
let cookieA: string, cookieB: string, cookieGrace: string, cookieExpired: string, cookieCancelled: string, cookieJoiner: string;
let creatorName: string;

beforeAll(async () => {
  const userA = await createUser("Usuario A");
  const userB = await createUser("Usuario B");
  const userGrace = await createUser("Usuario Grace");
  const userExpired = await createUser("Usuario Expired");
  const userCancelled = await createUser("Usuario Cancelled");
  const userJoiner = await createUser("Usuario Joiner");
  const userFullCreator = await createUser("Dueño Equipo Lleno");
  creatorName = "Dueño Equipo Lleno";

  teamA = await createTeam({ inviteCode: "TSTA01", creatorUserId: userA });
  teamB = await createTeam({ inviteCode: "TSTB01", creatorUserId: userB });
  teamFull = await createTeam({ inviteCode: "TSTF01", memberLimit: 1, creatorUserId: userFullCreator });

  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

  teamGrace = await createTeam({ inviteCode: "TSTG01", subscriptionStatus: "paused", pastDueSince: oneHourAgo });
  teamExpired = await createTeam({ inviteCode: "TSTE01", subscriptionStatus: "paused", pastDueSince: twentyFiveHoursAgo });
  teamCancelled = await createTeam({ inviteCode: "TSTC01", subscriptionStatus: "cancelled" });

  await db.update(usersTable).set({ teamId: teamA }).where(eq(usersTable.id, userA));
  await db.update(usersTable).set({ teamId: teamB }).where(eq(usersTable.id, userB));
  await db.update(usersTable).set({ teamId: teamFull }).where(eq(usersTable.id, userFullCreator));
  await db.update(usersTable).set({ teamId: teamGrace }).where(eq(usersTable.id, userGrace));
  await db.update(usersTable).set({ teamId: teamExpired }).where(eq(usersTable.id, userExpired));
  await db.update(usersTable).set({ teamId: teamCancelled }).where(eq(usersTable.id, userCancelled));

  cookieA = await createSessionCookie(userA);
  cookieB = await createSessionCookie(userB);
  cookieGrace = await createSessionCookie(userGrace);
  cookieExpired = await createSessionCookie(userExpired);
  cookieCancelled = await createSessionCookie(userCancelled);
  cookieJoiner = await createSessionCookie(userJoiner);
});

afterAll(async () => {
  if (userIds.length) await db.delete(breakEntriesTable).where(inArray(breakEntriesTable.userId, userIds));
  if (sessionIds.length) await db.delete(sessionsTable).where(inArray(sessionsTable.id, sessionIds));
  if (userIds.length) await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  if (teamIds.length) await db.delete(teamsTable).where(inArray(teamsTable.id, teamIds));
  await db.delete(webhookEventsTable).where(eq(webhookEventsTable.dedupeKey, "test_dedup_event:test-dedup-12345"));
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Grupo A: permisos ────────────────────────────────────────────────────

describe("Grupo A — permisos", () => {
  it("1. leer un equipo sin sesión → 401", async () => {
    const res = await request(app).get(`/api/teams/${teamA}`);
    expect(res.status).toBe(401);
  });

  it("2. leer un equipo ajeno (con sesión de otro equipo) → 403", async () => {
    const res = await request(app).get(`/api/teams/${teamA}`).set("Cookie", cookieB);
    expect(res.status).toBe(403);
  });

  it("3. leer tu propio equipo → 200", async () => {
    const res = await request(app).get(`/api/teams/${teamA}`).set("Cookie", cookieA);
    expect(res.status).toBe(200);
    expect(res.body.inviteCode).toBeDefined();
  });

  it("4. cambiar el logo sin sesión → 401", async () => {
    const res = await request(app).patch(`/api/teams/${teamA}/logo`).send({});
    expect(res.status).toBe(401);
  });

  it("5. crear un equipo sin sesión → 401", async () => {
    const res = await request(app).post("/api/teams").send({});
    expect(res.status).toBe(401);
  });

  it("6. unirse a un equipo sin sesión → 401", async () => {
    const res = await request(app).post("/api/teams/join").send({});
    expect(res.status).toBe(401);
  });

  it("7. ver el leaderboard sin sesión → 401", async () => {
    const res = await request(app).get(`/api/teams/${teamA}/leaderboard`);
    expect(res.status).toBe(401);
  });
});

// ── Grupo B: dinero y tiempo ────────────────────────────────────────────

describe("Grupo B — dinero y tiempo", () => {
  it("8. el mismo evento de webhook no se procesa dos veces", async () => {
    const payload = { type: "test_dedup_event", data: { id: "test-dedup-12345" } };

    await request(app).post("/api/webhooks/mercadopago").send(payload);
    await request(app).post("/api/webhooks/mercadopago").send(payload);
    await wait(300); // el procesamiento es asíncrono (fire-and-forget)

    const rows = await db
      .select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.dedupeKey, "test_dedup_event:test-dedup-12345"));

    expect(rows.length).toBe(1);
  });

  it("9a. equipo pausado hace 1hs (dentro de la gracia) → puede registrar un descanso", async () => {
    const res = await request(app)
      .post("/api/breaks")
      .set("Cookie", cookieGrace)
      .send({ userId: 0, breakType: "hydration" });
    expect(res.status).toBe(201);
  });

  it("9b. equipo pausado hace 25hs (gracia vencida) → no puede registrar un descanso", async () => {
    const res = await request(app)
      .post("/api/breaks")
      .set("Cookie", cookieExpired)
      .send({ userId: 0, breakType: "hydration" });
    expect(res.status).toBe(403);
  });

  it("9c. equipo cancelado → no puede registrar un descanso", async () => {
    const res = await request(app)
      .post("/api/breaks")
      .set("Cookie", cookieCancelled)
      .send({ userId: 0, breakType: "hydration" });
    expect(res.status).toBe(403);
  });

  it("10. unirse a un equipo lleno → mensaje con el nombre del creador", async () => {
    const res = await request(app)
      .post("/api/teams/join")
      .set("Cookie", cookieJoiner)
      .send({ inviteCode: "TSTF01" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain(creatorName);
  });
});