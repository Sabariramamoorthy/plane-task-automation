import "server-only";
import { redirect } from "next/navigation";
import { getAppSession, getActiveSessionUser } from "@/lib/auth-session";

export async function requireSession() {
  const session = await getAppSession();
  if (!session?.user) {
    redirect("/login");
  }

  const activeUser = await getActiveSessionUser();
  if (!activeUser) {
    redirect("/login?disabled=1");
  }

  return session;
}
