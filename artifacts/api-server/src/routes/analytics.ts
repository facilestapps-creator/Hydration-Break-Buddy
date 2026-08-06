import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, analyticsSessionsTable } from "@workspace/db";
import { eq, sql, count, countDistinct } from "drizzle-orm";
import { analyticsLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

// POST /analytics/ping — public, rate-limited heartbeat
router.post("/analytics/ping", analyticsLimiter, async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const ip = req.ip ?? "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
  const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;
  const now = new Date();

  try {
    await db
      .insert(analyticsSessionsTable)
      .values({
        sessionId: sessionId.trim(),
        ipHash,
        userAgent,
        firstSeenAt: now,
        lastSeenAt: now,
        pingCount: 1,
      })
      .onConflictDoUpdate({
        target: analyticsSessionsTable.sessionId,
        set: {
          lastSeenAt: now,
          pingCount: sql`${analyticsSessionsTable.pingCount} + 1`,
        },
      });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[analytics] Error upserting session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/summary — protected by x-admin-key header
router.get("/analytics/summary", async (req, res) => {
  const adminKey = process.env.ADMIN_ANALYTICS_KEY;
  if (!adminKey || req.headers["x-admin-key"] !== adminKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Total sessions
    const [{ total }] = await db
      .select({ total: count() })
      .from(analyticsSessionsTable);

    // Unique IPs
    const [{ uniqueIps }] = await db
      .select({ uniqueIps: countDistinct(analyticsSessionsTable.ipHash) })
      .from(analyticsSessionsTable);

    // Returning IPs: ipHash that appears in more than one session
    const returningResult = await db.execute<{ returning: string }>(sql`
      SELECT COUNT(*)::int AS returning
      FROM (
        SELECT ip_hash
        FROM analytics_sessions
        GROUP BY ip_hash
        HAVING COUNT(DISTINCT session_id) > 1
      ) sub
    `);
    const returningIpCount = Number(returningResult.rows[0]?.returning ?? 0);

    // Average session duration in seconds
    const avgResult = await db.execute<{ avg_seconds: string | null }>(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at))))::int AS avg_seconds
      FROM analytics_sessions
    `);
    const avgSessionDurationSeconds = Number(avgResult.rows[0]?.avg_seconds ?? 0);

    // Bounce count: pingCount = 1 OR duration < 2 seconds
    const bounceResult = await db.execute<{ bounces: string }>(sql`
      SELECT COUNT(*)::int AS bounces
      FROM analytics_sessions
      WHERE ping_count = 1
         OR EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) < 2
    `);
    const bounceCount = Number(bounceResult.rows[0]?.bounces ?? 0);

    // Sessions per day (grouped by firstSeenAt date, UTC)
    const perDayResult = await db.execute<{ day: string; sessions: string }>(sql`
      SELECT DATE(first_seen_at AT TIME ZONE 'UTC') AS day,
             COUNT(*)::int AS sessions
      FROM analytics_sessions
      GROUP BY day
      ORDER BY day ASC
    `);

    res.status(200).json({
      totalSessions: Number(total),
      uniqueIpCount: Number(uniqueIps),
      returningIpCount,
      avgSessionDurationSeconds,
      bounceCount,
      sessionsPerDay: perDayResult.rows.map((r) => ({
        day: r.day,
        sessions: Number(r.sessions),
      })),
    });
  } catch (err) {
    console.error("[analytics] Error fetching summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
