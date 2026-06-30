import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
};

export const getAppSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

async function resolveIsActive(sessionUser: SessionUser) {
  if (typeof sessionUser.isActive === "boolean") {
    return sessionUser.isActive;
  }

  const row = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
    columns: { isActive: true },
  });
  return row?.isActive ?? false;
}

export const getActiveSessionUser = cache(async () => {
  const session = await getAppSession();
  if (!session?.user) return null;

  const sessionUser = session.user as SessionUser;
  if (sessionUser.isActive === false) return null;
  if (sessionUser.isActive === true) return session.user;

  const active = await resolveIsActive(sessionUser);
  if (!active) return null;

  return session.user;
});
