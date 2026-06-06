import { NextResponse } from "next/server";
import { createOAuthState, isGitHubOAuthConfigured, OAUTH_STATE_COOKIE } from "../../../lib/github-auth";

export async function GET(request: Request) {
  const home = new URL("/", request.url);
  if (!isGitHubOAuthConfigured()) {
    home.searchParams.set("auth_error", "GitHub OAuth is not configured yet.");
    return NextResponse.redirect(home);
  }

  const state = createOAuthState();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", new URL("/api/auth/github/callback", request.url).toString());
  authorizeUrl.searchParams.set("scope", "read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
