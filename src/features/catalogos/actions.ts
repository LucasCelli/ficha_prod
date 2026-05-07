"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/features/auth/session";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CatalogoDeleteActionState, CatalogoFieldErrors, CatalogoFormState } from "./form-state";
import { catalogItemSchema, type CatalogItemValues } from "./schema";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCatalogItemInput(formData: FormData) {
  return {
    active: formData.get("active"),
    aliases: formData.get("aliases"),
    composition: formData.get("composition"),
    description: formData.get("description"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
  };
}

function getCatalogItemPayload(values: CatalogItemValues) {
  return {
    active: values.active,
    aliases: values.aliases,
    description: values.description,
    kind: values.kind,
    metadata: values.composition ? { composition: values.composition } : {},
    name: values.name,
    slug: slugify(values.name),
    sort_order: values.sortOrder,
  };
}

function getValidationState(fieldErrors: CatalogoFieldErrors): CatalogoFormState {
  return {
    fieldErrors,
    message: "Revise os campos destacados antes de salvar o item.",
    status: "error",
  };
}

function getParsedErrors(issues: { message: string; path: PropertyKey[] }[]) {
  return issues.reduce<CatalogoFieldErrors>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === "string") {
      errors[field as keyof CatalogoFieldErrors] = issue.message;
    }
    return errors;
  }, {});
}

function getReturnTo(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function withToastParam(path: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("toast", value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export async function saveCatalogItemAction(_previousState: CatalogoFormState, formData: FormData): Promise<CatalogoFormState> {
  await requireSuperadmin();

  const parsed = catalogItemSchema.safeParse(getCatalogItemInput(formData));

  if (!parsed.success) {
    return getValidationState(getParsedErrors(parsed.error.issues));
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Catálogos indisponíveis.",
      status: "error",
    };
  }

  const id = String(formData.get("id") ?? "").trim();
  const supabase = createServerSupabaseClient();
  const payload = getCatalogItemPayload(parsed.data);
  const result = id
    ? await supabase.from("catalog_items").update(payload).eq("id", id)
    : await supabase.from("catalog_items").insert(payload);

  if (result.error) {
    return {
      message: result.error.message,
      status: "error",
    };
  }

  revalidatePath("/catalogos");

  const returnTo = getReturnTo(formData);
  if (returnTo) {
    redirect(withToastParam(returnTo, id ? "catalog-item-updated" : "catalog-item-created"));
  }

  return {
    message: "Item salvo no catálogo.",
    status: "success",
  };
}

export async function deleteCatalogItemAction(
  _previousState: CatalogoDeleteActionState,
  formData: FormData,
): Promise<CatalogoDeleteActionState> {
  await requireSuperadmin();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      message: "Item invalido para exclusao.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Catalogos indisponiveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().from("catalog_items").delete().eq("id", id);

  if (error) {
    return {
      message: error.message,
      status: "error",
    };
  }

  revalidatePath("/catalogos");
  revalidatePath("/fichas");
  redirect(withToastParam(getReturnTo(formData) ?? "/catalogos", "catalog-item-deleted"));
}
