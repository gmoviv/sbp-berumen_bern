// src/app/api/admin/clusters/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/clients";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await db.query(`SELECT * FROM clusters ORDER BY name ASC`);
    return NextResponse.json({ clusters: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const id = name.toLowerCase().replace(/\s+/g, "-");
    await db.query(
      `INSERT INTO clusters (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [id, name]
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
