import { config } from "dotenv";
import { randomUUID } from "crypto";
import { hashPassword } from "@better-auth/utils/password";
import postgres from "postgres";

config({ path: ".env.local" });

const ADMIN_EMAIL = "sabari.r@cloudshiftsolutions.in";
const ADMIN_PASSWORD = "Cloud@2026";
const ADMIN_NAME = "Sabari Admin";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in .env.local");
  }

  const sql = postgres(databaseUrl, { prepare: false });
  const existingUsers = await sql<
    Array<{ id: string }>
  >`select id from "user" where email = ${ADMIN_EMAIL} limit 1`;
  const existingUser = existingUsers[0];

  const userId = existingUser?.id ?? randomUUID();
  if (!existingUser) {
    await sql`insert into "user" (id, name, email, email_verified, is_active, created_at, updated_at)
              values (${userId}, ${ADMIN_NAME}, ${ADMIN_EMAIL}, true, true, now(), now())`;
  } else {
    await sql`update "user"
              set name = ${ADMIN_NAME}, email_verified = true, is_active = true, updated_at = now()
              where id = ${userId}`;
  }

  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const existingAccounts = await sql<
    Array<{ id: string }>
  >`select id from account where user_id = ${userId} and provider_id = 'credential' limit 1`;
  const existingAccount = existingAccounts[0];

  if (existingAccount) {
    await sql`update account
              set account_id = ${userId},
                  password = ${hashedPassword},
                  updated_at = now()
              where id = ${existingAccount.id}`;
  } else {
    await sql`insert into account
      (id, account_id, provider_id, user_id, password, created_at, updated_at)
      values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hashedPassword}, now(), now())`;
  }

  await sql.end();
  console.log("Admin user ready:", ADMIN_EMAIL);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
