import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth-session";

export async function getSessionUser() {
  return getActiveSessionUser();
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export function accountDisabled() {
  return NextResponse.json(
    { success: false, error: "Account is deactivated" },
    { status: 403 },
  );
}

export function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function notFound(error = "Not found") {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function serverError(error: string) {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

export function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}
