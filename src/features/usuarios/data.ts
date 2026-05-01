import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Operador } from "./types";

export type UsuariosResult =
  | {
      kind: "ok";
      operadores: Operador[];
    }
  | {
      kind: "not-configured";
      operadores: [];
    }
  | {
      kind: "error";
      message: string;
      operadores: [];
    };

export async function listOperadores(): Promise<UsuariosResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      operadores: [],
    };
  }

  try {
    const { data, error } = await createServerSupabaseClient()
      .from("app_users")
      .select("id,username,display_name,active,last_login_at,created_at,updated_at")
      .eq("role", "operador")
      .order("active", { ascending: false })
      .order("display_name", { ascending: true });

    if (error) {
      return {
        kind: "error",
        message: error.message,
        operadores: [],
      };
    }

    return {
      kind: "ok",
      operadores: data ?? [],
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao consultar operadores.",
      operadores: [],
    };
  }
}
