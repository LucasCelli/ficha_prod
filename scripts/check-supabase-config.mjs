import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const TABLES = ["clientes", "fichas", "ficha_itens", "ficha_imagens", "catalog_items"];

function mask(value) {
  if (!value) return "missing";
  if (value.length <= 12) return "set";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function printEnvStatus() {
  console.log("Supabase env:");
  REQUIRED_ENV.forEach((name) => {
    console.log(`- ${name}: ${mask(process.env[name])}`);
  });
}

function hasRequiredEnv() {
  return REQUIRED_ENV.every((name) => Boolean(process.env[name]));
}

async function countRows(supabase, table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact" }).limit(1);

  if (error) {
    return {
      error: error.message,
      table,
    };
  }

  return {
    count: count ?? 0,
    table,
  };
}

async function main() {
  printEnvStatus();

  if (!hasRequiredEnv()) {
    console.log("\nStatus: missing-env");
    console.log("Add the missing Supabase variables to .env before running seed/import scripts.");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  console.log("\nSchema checks:");
  const results = await Promise.all(TABLES.map((table) => countRows(supabase, table)));
  results.forEach((result) => {
    if ("error" in result) {
      console.log(`- ${result.table}: error: ${result.error}`);
      return;
    }

    console.log(`- ${result.table}: ${result.count}`);
  });

  const hasErrors = results.some((result) => "error" in result);
  console.log(`\nStatus: ${hasErrors ? "schema-not-ready" : "ready"}`);
  process.exitCode = hasErrors ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
