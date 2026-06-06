import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GitBentoApp } from "../components/GitBentoApp";
import { readSessionToken, SESSION_COOKIE } from "../lib/github-auth";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string }>;
}) {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) redirect("/");

  const params = await searchParams;
  return <GitBentoApp initialUsername={params.username ?? session.login} autoGenerate />;
}
