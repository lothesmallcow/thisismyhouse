// Download a CV: the owner's own, or any for the admin.
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { currentAdmin, currentUser } from "@/lib/server/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const admin = user?.role === "user" ? null : await currentAdmin();
  if (!user && !admin) return new Response("Non autorizzato", { status: 401 });
  const { id } = await ctx.params;
  const db = getDb();
  const cv = admin
    ? await db.query.cvs.findFirst({ where: eq(schema.cvs.id, Number(id)) })
    : await db.query.cvs.findFirst({ where: and(eq(schema.cvs.id, Number(id)), eq(schema.cvs.userId, user!.id)) });
  if (!cv) return new Response("Non trovato", { status: 404 });
  return new Response(new Uint8Array(cv.data), {
    headers: {
      "Content-Type": cv.mime,
      "Content-Disposition": `attachment; filename="${cv.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
