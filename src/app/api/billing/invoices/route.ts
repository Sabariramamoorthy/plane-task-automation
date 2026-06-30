import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/api-helpers";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  return NextResponse.json(
    {
      success: false,
      error: "Invoices are created by an admin. Contact support if you need a bill for this month.",
    },
    { status: 403 },
  );
}
