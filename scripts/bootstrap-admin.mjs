import { createClient } from "@supabase/supabase-js";
import { PrismaClient, Role } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import WebSocket from "ws";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const resolvedSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolvedServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resolvedAdminEmail = process.env.FIRST_ADMIN_EMAIL;
const resolvedAdminPassword = process.env.FIRST_ADMIN_PASSWORD;
const resolvedAdminName = process.env.FIRST_ADMIN_FULL_NAME ?? "Workspace Owner";

if (!resolvedSupabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!resolvedServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local or export it in your shell."
  );
}

if (/^postgres(ql)?:\/\//i.test(resolvedServiceRoleKey)) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY looks like DATABASE_URL. Paste the real Supabase service role key instead."
  );
}

if (!resolvedAdminEmail) {
  throw new Error("Missing FIRST_ADMIN_EMAIL");
}

if (!resolvedAdminPassword) {
  throw new Error("Missing FIRST_ADMIN_PASSWORD");
}

const supabase = createClient(resolvedSupabaseUrl, resolvedServiceRoleKey, {
  realtime: {
    transport: WebSocket
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const prisma = new PrismaClient();

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertAuthUser() {
  const existing = await findAuthUserByEmail(resolvedAdminEmail);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: resolvedAdminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: resolvedAdminName,
        role: "OWNER"
      }
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: resolvedAdminEmail,
    password: resolvedAdminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: resolvedAdminName,
      role: "OWNER"
    }
  });

  if (error || !data.user) {
    throw error ?? new Error("Unable to create admin account");
  }

  return data.user;
}

async function main() {
  const authUser = await upsertAuthUser();

  await prisma.user.upsert({
    where: { authUserId: authUser.id },
    update: {
      email: resolvedAdminEmail,
      fullName: resolvedAdminName,
      role: Role.OWNER
    },
    create: {
      authUserId: authUser.id,
      email: resolvedAdminEmail,
      fullName: resolvedAdminName,
      role: Role.OWNER
    }
  });

  console.log(`Admin account ready: ${resolvedAdminEmail}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
