export const appUserRoles = ["superadmin", "operador"] as const;

export type AppUserRole = (typeof appUserRoles)[number];

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
