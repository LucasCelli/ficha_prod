import { getServerErrorMessage } from "@/lib/server/boundaries";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Usuario } from "./types";

export type UsuariosResult =
  | {
      kind: "ok";
      usuarios: Usuario[];
    }
  | {
      kind: "not-configured";
      usuarios: [];
    }
  | {
      kind: "error";
      message: string;
      usuarios: [];
    };

export async function listUsuarios(): Promise<UsuariosResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      usuarios: [],
    };
  }

  try {
    const { data, error } = await createServerSupabaseClient()
      .from("app_users")
      .select("id,username,display_name,role,active,last_login_at,created_at,updated_at")
      .order("active", { ascending: false })
      .order("display_name", { ascending: true });

    if (error) {
      return {
        kind: "error",
        message: getServerErrorMessage("usuarios.list", error, "Não foi possível consultar os usuários."),
        usuarios: [],
      };
    }

    return {
      kind: "ok",
      usuarios: data ?? [],
    };
  } catch (error) {
    return {
      kind: "error",
      message: getServerErrorMessage("usuarios.list", error, "Não foi possível consultar os usuários."),
      usuarios: [],
    };
  }
}
