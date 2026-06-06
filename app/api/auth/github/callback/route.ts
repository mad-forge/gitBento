import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, OAUTH_STATE_COOKIE, SESSION_COOKIE, type GitHubSession } from "../../../../lib/github-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = new URL("/", request.url);
  const loading = new URL("/auth/loading", request.url);
  const cookieStore = await cookies();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    home.searchParams.set("auth_error", "GitHub sign-in could not be verified.");
    return NextResponse.redirect(home);
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    });
    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) throw new Error("Missing access token");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenPayload.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const user = (await userResponse.json()) as { id: number; login: string; name: string | null; avatar_url: string };
    const session: GitHubSession = {
      id: user.id,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    const response = NextResponse.redirect(loading);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    home.searchParams.set("auth_error", "GitHub sign-in failed. Please try again.");
    return NextResponse.redirect(home);
  }
}
