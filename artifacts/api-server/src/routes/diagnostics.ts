import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// GET /diagnostics/users-team-id — TEMPORAL, protegido con la misma clave que
// /analytics/summary. Diagnostica si users.team_id acepta NULL en producción.
// Borrar este archivo (y la línea que lo registra en routes/index.ts) una vez
// resuelto el bug de Modo Equipo.
router.get("/diagnostics/users-team-id", async (req, res) => {
  const adminKey = process.env.ADMIN_ANALYTICS_KEY;
  const providedKey = req.headers["x-admin-key"] ?? req.query.key;
  if (!adminKey || providedKey !== adminKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result: {
    schemaInfo: unknown;
    insertTest: { ok: boolean; error?: string; errorCode?: string; errorDetail?: string };
  } = {
    schemaInfo: null,
    insertTest: { ok: false },
  };

  try {
    const schemaRows = await db.execute(sql`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'team_id'
    `);
    result.schemaInfo = schemaRows.rows;
  } catch (err) {
    result.schemaInfo = { error: String(err) };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(usersTable).values({ name: "diagnostico_temporal" });
      throw new Error("__ROLLBACK_DIAGNOSTIC__");
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "__ROLLBACK_DIAGNOSTIC__") {
      result.insertTest = { ok: true };
    } else {
      const e = err as { message?: string; cause?: unknown; code?: string; detail?: string };
      result.insertTest = {
        ok: false,
        error: e?.message ?? String(err),
        errorCode: (e?.cause as { code?: string } | undefined)?.code ?? e?.code,
        errorDetail: (e?.cause as { detail?: string } | undefined)?.detail ?? e?.detail,
      };
    }
  }

  res.json(result);
});

export default router;
