import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.AUTH_SEED_USERNAME;
const displayName = process.env.AUTH_SEED_DISPLAY_NAME || username;
const pin = process.env.AUTH_SEED_PIN;
const role = process.env.AUTH_SEED_ROLE || "superadmin";

if (!supabaseUrl || !serviceRoleKey || !username || !pin) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_SEED_USERNAME e AUTH_SEED_PIN.");
  process.exit(1);
}

if (!["superadmin", "operador"].includes(role)) {
  console.error("AUTH_SEED_ROLE deve ser superadmin ou operador.");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const pinHash = scryptSync(pin, salt, 64).toString("base64url");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const { error } = await supabase.from("app_users").upsert(
  {
    active: true,
    display_name: displayName,
    pin_hash: pinHash,
    pin_salt: salt,
    role,
    username,
  },
  {
    onConflict: "username_normalized",
  },
);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Usuario ${username} salvo como ${role}.`);
