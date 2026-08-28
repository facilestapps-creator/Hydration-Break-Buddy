import { db, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  const teams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, inviteCode: teamsTable.inviteCode })
    .from(teamsTable);

  console.log(`Encontrados ${teams.length} equipos. Regenerando códigos...`);

  for (const team of teams) {
    let newCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const existing = await db.select({ id: teamsTable.id }).from(teamsTable).where(eq(teamsTable.inviteCode, newCode));
      if (existing.length === 0) break;
      newCode = generateInviteCode();
    }
    await db.update(teamsTable).set({ inviteCode: newCode }).where(eq(teamsTable.id, team.id));
    console.log(`Equipo "${team.name}" (id ${team.id}): ${team.inviteCode} -> ${newCode}`);
  }

  console.log("Listo. Todos los códigos fueron regenerados.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error regenerando códigos:", err);
  process.exit(1);
});
