export const appUserRoles = ["superadmin", "vendedor", "designer"] as const;

export type AppUserRole = (typeof appUserRoles)[number];

export const appUserRoleLabels: Record<AppUserRole, string> = {
  designer: "Designer",
  superadmin: "Admin",
  vendedor: "Vendedor",
};

export type AppSessionUser = {
  displayName: string;
  id: string;
  role: AppUserRole;
  username: string;
};

export type AppSession = {
  expiresAt: string;
  user: AppSessionUser;
};
