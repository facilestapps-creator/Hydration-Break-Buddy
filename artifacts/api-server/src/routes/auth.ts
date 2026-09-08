import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
import { db, usersTable, teamsTable, sessionsTable, magicLinksTable } from "@workspace/db";
import {
  RequestMagicLinkBody,
  RequestMagicLinkResponse,
  VerifyMagicLinkBody,
  VerifyMagicLinkResponse,
} from "@workspace/api-zod";
import { magicLinkLimiter, strictLimiter } from "../lib/rate-limiters";
import { sendEmail } from "../lib/mailer";

const router: IRouter = Router();

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://breakbuddy.facilest.com";
const MAGIC_LINK_TTL_MS = 30 * 60 * 1000; // 30 minutes

router.post("/auth/magic-link/request", magicLinkLimiter, async (req, res): Promise<void> => {
  const parsed = RequestMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Always respond ok, whether or not the email is registered — avoids
  // leaking which emails exist in the system to anyone probing the endpoint.
  res.json(RequestMagicLinkResponse.parse({ ok: true }));

  try {
    // If more than one account shares this email (allowed — email isn't
    // unique on purpose), send the link for the most recently active one.
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .orderBy(usersTable.id)
      .limit(1);

    if (!user) return; // silently do nothing — no account with this email

    const token = randomUUID();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await db.insert(magicLinksTable).values({ userId: user.id, tokenHash, expiresAt });

    const link = `${APP_BASE_URL}/recover?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Your Break Buddy sign-in link",
      text: `Click this link to sign in to Break Buddy:\n${link}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
      html: `
        <p style="font-family:sans-serif;font-size:14px;color:#333;">
          Click the button below to sign in to Break Buddy.
        </p>
        <p>
          <a href="${link}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:16px;text-decoration:none;font-weight:bold;font-family:sans-serif;">
            Sign in to Break Buddy
          </a>
        </p>
        <p style="font-family:sans-serif;font-size:13px;color:#888;">
          This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      `,
    });
  } catch (err) {
    console.error("[auth] magic link request error:", err);
  }
});

router.post("/auth/magic-link/verify", strictLimiter, async (req, res): Promise<void> => {
  const parsed = VerifyMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

  const rows = await db
    .select()
    .from(magicLinksTable)
    .where(
      and(
        eq(magicLinksTable.tokenHash, tokenHash),
        eq(magicLinksTable.consumed, false),
        gt(magicLinksTable.expiresAt, new Date()),
      )
    );

  if (rows.length === 0) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const magicLink = rows[0];

  // Mark consumed immediately — single use only, even if something below fails.
  await db
    .update(magicLinksTable)
    .set({ consumed: true })
    .where(eq(magicLinksTable.id, magicLink.id));

  // Start a session, same mechanism as POST /users.
  const sessionToken = randomUUID();
  const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");
  await db.insert(sessionsTable).values({ userId: magicLink.userId, tokenHash: sessionTokenHash });

  res.cookie("bb_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  const rowsUser = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      teamId: usersTable.teamId,
      teamName: teamsTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(teamsTable, eq(usersTable.teamId, teamsTable.id))
    .where(eq(usersTable.id, magicLink.userId));

  const u = rowsUser[0];
  res.json(VerifyMagicLinkResponse.parse({
    id: u.id,
    name: u.name,
    teamId: u.teamId ?? null,
    teamName: u.teamName ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
});

export default router;