"use server";

import { getActionError, requireSuperadminAction } from "@/lib/server/boundaries";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CatalogoDeleteActionState, CatalogoFieldErrors, CatalogoFormState } from "./form-state";
import { catalogItemSchema, type CatalogItemValues } from "./schema";
import { catalogKinds, type CatalogKind } from "./types";

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
    fabricType: formData.get("fabricType"),
    fabricWidthCm: formData.get("fabricWidthCm"),
    kind: formData.get("kind"),
    measureBackHeightCm: formData.get("measureBackHeightCm"),
    measureBackWidthCm: formData.get("measureBackWidthCm"),
    measureFrontHeightCm: formData.get("measureFrontHeightCm"),
    measureFrontWidthCm: formData.get("measureFrontWidthCm"),
    measureLongSleeveHeightCm: formData.get("measureLongSleeveHeightCm"),
    measureLongSleeveWidthCm: formData.get("measureLongSleeveWidthCm"),
    measureShortSleeveHeightCm: formData.get("measureShortSleeveHeightCm"),
    measureShortSleeveWidthCm: formData.get("measureShortSleeveWidthCm"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
  };
}

function getCatalogItemPayload(values: CatalogItemValues) {
  return {
    active: values.active,
    aliases: values.aliases,
    description: values.description ?? null,
    fabric_type: values.kind === "tecido" ? values.fabricType ?? null : null,
    fabric_width_cm: values.kind === "tecido" ? values.fabricWidthCm ?? null : null,
    kind: values.kind,
    metadata: values.composition ? { composition: values.composition } : {},
    measure_back_height_cm: values.kind === "tamanho" ? values.measureBackHeightCm ?? null : null,
    measure_back_width_cm: values.kind === "tamanho" ? values.measureBackWidthCm ?? null : null,
    measure_front_height_cm: values.kind === "tamanho" ? values.measureFrontHeightCm ?? null : null,
    measure_front_width_cm: values.kind === "tamanho" ? values.measureFrontWidthCm ?? null : null,
    measure_long_sleeve_height_cm: values.kind === "tamanho" ? values.measureLongSleeveHeightCm ?? null : null,
    measure_long_sleeve_width_cm: values.kind === "tamanho" ? values.measureLongSleeveWidthCm ?? null : null,
    measure_short_sleeve_height_cm: values.kind === "tamanho" ? values.measureShortSleeveHeightCm ?? null : null,
    measure_short_sleeve_width_cm: values.kind === "tamanho" ? values.measureShortSleeveWidthCm ?? null : null,
    name: values.name,
    slug: slugify(values.name),
    sort_order: values.sortOrder,
  };
}

function parseCatalogKind(value: unknown): CatalogKind | undefined {
  return catalogKinds.includes(value as CatalogKind) ? (value as CatalogKind) : undefined;
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
  await requireSuperadminAction();

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

  if (!id && payload.sort_order <= 0) {
    const { data } = await supabase
      .from("catalog_items")
      .select("sort_order")
      .eq("kind", payload.kind)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    payload.sort_order = (data?.sort_order ?? 0) + 1;
  }

  const result = id
    ? await supabase.from("catalog_items").update(payload).eq("id", id)
    : await supabase.from("catalog_items").insert(payload);

  if (result.error) {
    return {
      message: getActionError("catalogos.save", result.error, "Não foi possível salvar o item.").message,
      status: "error",
    };
  }

  revalidatePath("/catalogos");
  revalidatePath("/ferramentas/plano-de-corte");
  revalidatePath("/fichas");

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
  await requireSuperadminAction();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      message: "Item inválido para exclusão.",
      status: "error",
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Catálogos indisponíveis.",
      status: "error",
    };
  }

  const { error } = await createServerSupabaseClient().from("catalog_items").delete().eq("id", id);

  if (error) {
    return {
      message: getActionError("catalogos.delete", error, "Não foi possível excluir o item.").message,
      status: "error",
    };
  }

  revalidatePath("/catalogos");
  revalidatePath("/ferramentas/plano-de-corte");
  revalidatePath("/fichas");
  redirect(withToastParam(getReturnTo(formData) ?? "/catalogos", "catalog-item-deleted"));
}

export async function deleteCatalogItemsAction(kind: CatalogKind, itemIds: string[]) {
  await requireSuperadminAction();

  const parsedKind = parseCatalogKind(kind);
  const ids = itemIds.map((id) => id.trim()).filter(Boolean);

  if (!parsedKind || ids.length === 0 || ids.length !== itemIds.length || new Set(ids).size !== ids.length) {
    return {
      message: "Itens inválidos para exclusão.",
      status: "error" as const,
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Catálogos indisponíveis.",
      status: "error" as const,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: existingItems, error: existingError } = await supabase
    .from("catalog_items")
    .select("id")
    .eq("kind", parsedKind)
    .in("id", ids);

  if (existingError) {
    return {
      message: getActionError("catalogos.validate", existingError, "Não foi possível validar os itens.").message,
      status: "error" as const,
    };
  }

  if ((existingItems?.length ?? 0) !== ids.length) {
    return {
      message: "Itens inválidos para esta categoria.",
      status: "error" as const,
    };
  }

  const { error } = await supabase.from("catalog_items").delete().eq("kind", parsedKind).in("id", ids);

  if (error) {
    return {
      message: getActionError("catalogos.delete", error, "Não foi possível excluir o item.").message,
      status: "error" as const,
    };
  }

  revalidatePath("/catalogos");
  revalidatePath("/ferramentas/plano-de-corte");
  revalidatePath("/fichas");

  return {
    deletedCount: ids.length,
    status: "success" as const,
  };
}

export async function saveCatalogItemOrderAction(kind: CatalogKind, itemIds: string[]) {
  await requireSuperadminAction();

  const parsedKind = parseCatalogKind(kind);
  const ids = itemIds.map((id) => id.trim()).filter(Boolean);

  if (!parsedKind || ids.length !== itemIds.length || new Set(ids).size !== ids.length) {
    return {
      message: "Ordem inválida.",
      status: "error" as const,
    };
  }

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      message: "Catálogos indisponíveis.",
      status: "error" as const,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: existingItems, error: existingError } = await supabase
    .from("catalog_items")
    .select("id")
    .eq("kind", parsedKind)
    .in("id", ids);

  if (existingError) {
    return {
      message: getActionError("catalogos.validate", existingError, "Não foi possível validar os itens.").message,
      status: "error" as const,
    };
  }

  if ((existingItems?.length ?? 0) !== ids.length) {
    return {
      message: "Itens inválidos para esta categoria.",
      status: "error" as const,
    };
  }

  const updates = ids.map((id, index) =>
    supabase
      .from("catalog_items")
      .update({ sort_order: index + 1 })
      .eq("id", id)
      .eq("kind", parsedKind),
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    return {
      message: getActionError("catalogos.reorder", failed.error, "Não foi possível salvar a ordem.").message,
      status: "error" as const,
    };
  }

  revalidatePath("/catalogos");
  revalidatePath("/ferramentas/plano-de-corte");
  revalidatePath("/fichas");

  return {
    status: "success" as const,
  };
}
