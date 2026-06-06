import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const database = await getDatabase();
    await database.command({ ping: 1 });

    return NextResponse.json(
      { ok: true, service: "database" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "database" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
