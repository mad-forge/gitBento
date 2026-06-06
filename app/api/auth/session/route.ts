import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "../../../lib/github-auth";

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ user: readSessionToken(cookieStore.get(SESSION_COOKIE)?.value) });
}
