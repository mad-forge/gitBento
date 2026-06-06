import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GitHubLoadingExperience } from "../../components/GitHubLoadingExperience";
import { readSessionToken, SESSION_COOKIE } from "../../lib/github-auth";

export default async function AuthLoadingPage() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) redirect("/");

  return <GitHubLoadingExperience user={session} />;
}
