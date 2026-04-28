import { NextResponse } from "next/server";
import { db } from "@/lib/clients";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/rbac";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await db.query(
      `SELECT id, name, role, cluster, metadata, context, updated_at 
       FROM personas 
       ORDER BY cluster ASC, name ASC`
    );
    return NextResponse.json({ personas: res.rows });
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
    const body = await req.json();
    const { name, role, cluster, metadata } = body;

    if (!name || !cluster) {
      return NextResponse.json({ error: "Name and Cluster are required" }, { status: 400 });
    }

    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + randomUUID().slice(0, 4);

    await db.query(
      `INSERT INTO personas (id, name, role, cluster, metadata, context)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name, role || "", cluster, metadata || {}, ""]
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
