import { AppShell } from "@/components/layout/AppShell";
import { isUserAdmin } from "@/lib/billing";
import { requireSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const admin = isUserAdmin(session.user.id, session.user.email);

  return <AppShell isAdmin={await admin}>{children}</AppShell>;
}
