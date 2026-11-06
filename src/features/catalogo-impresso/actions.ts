"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActionError, requireSuperadminAction } from "@/lib/server/boundaries";
import type { CatalogPrintActionState } from "./form-state";
import { catalogPrintCategorySchema, catalogPrintEntrySchema, catalogPrintReviewSchema, catalogPrintSettingsSchema } from "./schema";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function errorsFrom(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.reduce<Record<string, string>>((result, issue) => {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
    return result;
  }, {});
}

function errorState(message: string, issues?: Array<{ path: PropertyKey[]; message: string }>): CatalogPrintActionState {
  return { fieldErrors: issues ? errorsFrom(issues) : undefined, message, status: "error" };
}

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function saveCatalogPrintSettingsAction(_state: CatalogPrintActionState, formData: FormData): Promise<CatalogPrintActionState> {
  await requireSuperadminAction();
  const parsed = catalogPrintSettingsSchema.safeParse({
    address: formData.get("address"), businessName: formData.get("businessName"), coverImageUrl: formData.get("coverImageUrl"),
    email: formData.get("email"), footerText: formData.get("footerText"), instagram: formData.get("instagram"), logoUrl: formData.get("logoUrl"),
    subtitle: formData.get("subtitle"), title: formData.get("title"), whatsapp: formData.get("whatsapp"),
  });
  if (!parsed.success) return errorState("Revise as configurações.", parsed.error.issues);
  const input = parsed.data;
  const { error } = await createServerSupabaseClient().from("catalog_print_settings").update({
    address: input.address ?? null, business_name: input.businessName, cover_image_url: input.coverImageUrl ?? null,
    email: input.email ?? null, footer_text: input.footerText ?? null, instagram: input.instagram ?? null,
    logo_url: input.logoUrl ?? null, subtitle: input.subtitle ?? null, title: input.title, whatsapp: input.whatsapp ?? null,
  }).eq("id", 1);
  if (error) return errorState(getActionError("catalogo-impresso.settings", error, "Não foi possível salvar.").message);
  revalidatePath("/catalogo-impresso");
  return { message: "Configurações salvas. Regenere o PDF para publicá-las.", status: "success" };
}

export async function saveCatalogPrintCategoryAction(_state: CatalogPrintActionState, formData: FormData): Promise<CatalogPrintActionState> {
  await requireSuperadminAction();
  const parsed = catalogPrintCategorySchema.safeParse({ active: formData.get("active"), id: formData.get("id"), name: formData.get("name"), section: formData.get("section"), sortOrder: formData.get("sortOrder") });
  if (!parsed.success) return errorState("Revise a categoria.", parsed.error.issues);
  const supabase = createServerSupabaseClient();
  const input = parsed.data;
  let sortOrder = input.sortOrder;
  if (!input.id && !sortOrder) {
    const { data } = await supabase.from("catalog_print_categories").select("sort_order").eq("section", input.section).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    sortOrder = (data?.sort_order ?? 0) + 1;
  }
  const payload = { active: input.active, name: input.name, section: input.section, slug: slugify(input.name), sort_order: sortOrder };
  const result = input.id ? await supabase.from("catalog_print_categories").update(payload).eq("id", input.id) : await supabase.from("catalog_print_categories").insert(payload);
  if (result.error) return errorState(getActionError("catalogo-impresso.category", result.error, "Não foi possível salvar a categoria.").message);
  revalidatePath("/catalogo-impresso");
  return { message: "Categoria salva.", status: "success" };
}

export async function deleteCatalogPrintCategoryAction(formData: FormData) {
  await requireSuperadminAction();
  const id = value(formData, "id");
  const supabase = createServerSupabaseClient();
  const { count } = await supabase.from("catalog_print_entries").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) redirect("/catalogo-impresso?view=categories&error=category-in-use");
  const { error } = await supabase.from("catalog_print_categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/catalogo-impresso");
  redirect("/catalogo-impresso?view=categories&saved=category-deleted");
}

export async function saveCatalogPrintEntryAction(_state: CatalogPrintActionState, formData: FormData): Promise<CatalogPrintActionState> {
  await requireSuperadminAction();
  let images: unknown = [];
  try { images = JSON.parse(value(formData, "imagesJson") || "[]"); } catch { return errorState("A lista de imagens é inválida."); }
  const parsed = catalogPrintEntrySchema.safeParse({
    active: formData.get("active"), categoryId: formData.get("categoryId"), description: formData.get("description"), highlights: formData.get("highlights"),
    id: formData.get("id"), images, section: formData.get("section"), sortOrder: formData.get("sortOrder"), sourceFichaId: formData.get("sourceFichaId"), title: formData.get("title"),
  });
  if (!parsed.success) return errorState("Revise os campos do artigo.", parsed.error.issues);
  const supabase = createServerSupabaseClient();
  const input = parsed.data;
  const { data: category } = await supabase.from("catalog_print_categories").select("id,section").eq("id", input.categoryId).maybeSingle();
  if (!category || category.section !== input.section) return errorState("A categoria não pertence à seção escolhida.");
  let sortOrder = input.sortOrder;
  if (!input.id && !sortOrder) {
    const { data } = await supabase.from("catalog_print_entries").select("sort_order").eq("category_id", input.categoryId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    sortOrder = (data?.sort_order ?? 0) + 1;
  }
  const payload = { active: input.active, category_id: input.categoryId, description: input.description ?? null, highlights: input.highlights, section: input.section, sort_order: sortOrder, source_ficha_id: input.sourceFichaId, title: input.title };
  let entryId = input.id;
  if (entryId) {
    const { error } = await supabase.from("catalog_print_entries").update(payload).eq("id", entryId);
    if (error) return errorState(getActionError("catalogo-impresso.entry", error, "Não foi possível salvar o artigo.").message);
  } else {
    const { data, error } = await supabase.from("catalog_print_entries").insert(payload).select("id").single();
    if (error || !data) return errorState(getActionError("catalogo-impresso.entry", error, "Não foi possível criar o artigo.").message);
    entryId = data.id;
  }
  const imageRows = input.images.map((image, index) => ({ alt_text: image.altText || null, entry_id: entryId!, height: image.height ?? null, public_id: image.publicId ?? null, sort_order: index + 1, source_ficha_image_id: image.sourceFichaImageId ?? null, url: image.url, width: image.width ?? null }));
  const { data: inserted, error: imageError } = await supabase.from("catalog_print_entry_images").insert(imageRows).select("id");
  if (imageError || !inserted) {
    if (!input.id) await supabase.from("catalog_print_entries").delete().eq("id", entryId);
    return errorState(getActionError("catalogo-impresso.images", imageError, "Não foi possível salvar as imagens.").message);
  }
  const insertedIds = inserted.map((item) => item.id);
  await supabase.from("catalog_print_entry_images").delete().eq("entry_id", entryId).not("id", "in", `(${insertedIds.join(",")})`);
  revalidatePath("/catalogo-impresso");
  redirect("/catalogo-impresso?saved=entry");
}

export async function deleteCatalogPrintEntryAction(formData: FormData) {
  await requireSuperadminAction();
  const { error } = await createServerSupabaseClient().from("catalog_print_entries").delete().eq("id", value(formData, "id"));
  if (error) throw error;
  revalidatePath("/catalogo-impresso");
  redirect("/catalogo-impresso?saved=entry-deleted");
}

export async function reviewCatalogPrintFichaAction(formData: FormData) {
  const session = await requireSuperadminAction();
  const parsed = catalogPrintReviewSchema.safeParse({ fichaId: formData.get("fichaId"), reason: formData.get("reason"), status: formData.get("status") });
  if (!parsed.success) redirect("/catalogo-impresso?view=sources&error=review");
  const { error } = await createServerSupabaseClient().from("catalog_print_ficha_reviews").upsert({
    ficha_id: parsed.data.fichaId, ignored_reason: parsed.data.status === "ignorada" ? parsed.data.reason : null,
    reviewed_at: new Date().toISOString(), reviewed_by_user_id: session.user.id, status: parsed.data.status,
  });
  if (error) throw error;
  revalidatePath("/catalogo-impresso");
  redirect("/catalogo-impresso?view=sources&saved=review");
}
