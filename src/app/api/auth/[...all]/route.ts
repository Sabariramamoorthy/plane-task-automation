import { auth } from "@/lib/auth";
import { warmDatabase } from "@/lib/db";
import { toNextJsHandler } from "better-auth/next-js";

void warmDatabase();

export const { GET, POST } = toNextJsHandler(auth);
