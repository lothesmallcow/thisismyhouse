// Download a CV (her session or the admin's).
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { currentAdmin, currentUser } from "@/lib/server/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await currentUser()) && !(await currentAdmin())) return new Response("Non autorizzato", { status: 401 });
  const { id } = await ctx.params;
  const cv = await getDb().query.cvs.findFirst({ where: eq(schema.cvs.id, Number(id)) });
  if (!cv) return new Response("Non trovato", { status: 404 });
  return new Response(new Uint8Array(cv.data), {
    headers: {
      "Content-Type": cv.mime,
      "Content-Disposition": `attachment; filename="${cv.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
