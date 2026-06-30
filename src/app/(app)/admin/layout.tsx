import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/billing";
import { requireSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const admin = await isUserAdmin(session.user.id, session.user.email);

  if (!admin) {
    redirect("/");
  }

  return <>{children}</>;
}
