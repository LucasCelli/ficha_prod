"use client";

export const CREATE_FICHA_DRAFT_STORAGE_KEY = "ficha_prod:ficha_create_draft:v1";

export function clearCreateFichaDraftSnapshot() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CREATE_FICHA_DRAFT_STORAGE_KEY);
  } catch {
    // Local draft cleanup should never block the success flow.
  }
}
