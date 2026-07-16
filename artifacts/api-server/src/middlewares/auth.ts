import { type Request, type Response, type NextFunction } from "express";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";

/**
 * Middleware that reads the bb_session cookie, validates it against
 * the sessions table, and sets req.userId.
 * Returns 401 if the cookie is missing or invalid.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.cookies?.bb_session as string | undefined;
  if (!raw) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.tokenHash, tokenHash));

    if (rows.length === 0) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    req.userId = rows[0].userId;
    next();
  } catch (err) {
    res.status(500).json({ error: "Session validation failed" });
  }
}
