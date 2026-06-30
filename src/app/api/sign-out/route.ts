import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const signOutRequest = new Request(new URL("/api/auth/sign-out", request.url), {
    method: "POST",
    headers: request.headers,
  });

  return auth.handler(signOutRequest);
}
