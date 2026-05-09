import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const RUNTIME_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_CLOUD_NAME",
];

const TABLES = ["clientes", "fichas", "ficha_itens", "ficha_imagens", "catalog_items", "app_users", "app_sessions"];
const IS_WINDOWS = platform() === "win32";

let hasBlocker = false;

function mask(value) {
  if (!value) return "missing";
  if (value.length <= 12) return "set";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function mark(ok, label, detail = "") {
  const status = ok ? "ok" : "action-required";
  console.log(`- ${label}: ${status}${detail ? ` (${detail})` : ""}`);
  if (!ok) hasBlocker = true;
}

function checkEnvGroup(title, names) {
  console.log(`\n${title}:`);
  for (const name of names) {
    mark(Boolean(process.env[name]), name, mask(process.env[name]));
  }
}

function checkPublicSecretLeaks() {
  console.log("\nPublic env safety:");
  const suspiciousPublicKeys = Object.keys(process.env).filter((name) => {
    if (!name.startsWith("NEXT_PUBLIC_")) return false;
    return /SECRET|SERVICE|TOKEN|PIN|PASSWORD|PRIVATE/i.test(name);
  });

  mark(suspiciousPublicKeys.length === 0, "no sensitive-looking NEXT_PUBLIC env names", suspiciousPublicKeys.join(", "));
}

function checkGitignoredEnv() {
  console.log("\nLocal secret hygiene:");
  const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
  mark(gitignore.split(/\r?\n/).some((line) => line.trim() === ".env"), ".env is gitignored");
}

function checkVercelLink() {
  console.log("\nVercel project:");
  const projectPath = ".vercel/project.json";
  if (!existsSync(projectPath)) {
    mark(false, "workspace linked to Vercel", ".vercel/project.json missing");
  } else {
    try {
      const project = JSON.parse(readFileSync(projectPath, "utf8"));
      mark(Boolean(project.projectId && project.orgId), "workspace linked to Vercel", "project.json present");
    } catch {
      mark(false, "workspace linked to Vercel", "project.json invalid");
    }
  }

  const vercelVersion = spawnSync("vercel", ["--version"], { encoding: "utf8" });
  const npxVercelVersion =
    vercelVersion.status === 0
      ? null
      : IS_WINDOWS
        ? spawnSync("cmd", ["/c", "npx", "vercel", "--version"], { encoding: "utf8" })
        : spawnSync("npx", ["vercel", "--version"], { encoding: "utf8" });
  const cliVersion = vercelVersion.status === 0 ? vercelVersion : npxVercelVersion;
  const cliDetail = cliVersion?.stdout?.trim() || cliVersion?.stderr?.trim();
  mark(Boolean(cliVersion && cliVersion.status === 0), "Vercel CLI available", cliDetail);

  if (existsSync("vercel.json")) {
    const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
    mark(vercelConfig.cleanUrls === true, "vercel.json cleanUrls enabled");
    mark(vercelConfig.framework === "nextjs", "vercel.json framework is Next.js");
    mark(!("rewrites" in vercelConfig), "vercel.json has no legacy rewrites");
    mark(!("headers" in vercelConfig), "vercel.json has no legacy headers");
  } else {
    mark(false, "vercel.json present");
  }
}

async function countRows(supabase, table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact" }).limit(1);
  if (error) return { table, error: error.message };
  return { table, count: count ?? 0 };
}

async function checkSupabase() {
  console.log("\nSupabase data:");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    mark(false, "Supabase server connection", "missing env");
    return;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const tableResults = await Promise.all(TABLES.map((table) => countRows(supabase, table)));
  for (const result of tableResults) {
    if ("error" in result) {
      mark(false, result.table, result.error);
    } else {
      mark(result.count > 0 || result.table === "app_sessions", result.table, String(result.count));
    }
  }

  const { count: activeSuperadmins, error: superadminError } = await supabase
    .from("app_users")
    .select("id", { count: "exact" })
    .eq("active", true)
    .eq("role", "superadmin")
    .limit(1);
  mark(!superadminError && (activeSuperadmins ?? 0) > 0, "active superadmin exists", superadminError?.message ?? String(activeSuperadmins ?? 0));

  const { count: codexUsers, error: codexError } = await supabase
    .from("app_users")
    .select("id", { count: "exact" })
    .ilike("username_normalized", "%codex%")
    .limit(1);
  mark(!codexError && (codexUsers ?? 0) === 0, "no Codex temporary users remain", codexError?.message ?? String(codexUsers ?? 0));
}

checkEnvGroup("Runtime env required in Vercel production", RUNTIME_ENV);
checkPublicSecretLeaks();
checkGitignoredEnv();
checkVercelLink();
await checkSupabase();

console.log(`\nStatus: ${hasBlocker ? "action-required" : "ready-for-production"}`);
process.exitCode = hasBlocker ? 1 : 0;
