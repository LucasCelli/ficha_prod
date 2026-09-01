import type { AppUserRole } from "@/features/auth/types";

export type Usuario = {
  active: boolean;
  created_at: string;
  display_name: string;
  id: string;
  last_login_at: string | null;
  role: AppUserRole;
  updated_at: string;
  username: string;
};
