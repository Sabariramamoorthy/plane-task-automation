import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getActiveSessionUser, getAppSession } from "@/lib/auth-session";

export const requireSession = cache(async () => {
  const session = await getAppSession();
  if (!session?.user) {
    redirect("/login");
  }

  const activeUser = await getActiveSessionUser();
  if (!activeUser) {
    redirect("/login?disabled=1");
  }

  return session;
});
