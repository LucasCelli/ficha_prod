import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CatalogPrintDashboard, CatalogPrintEntry, CatalogPrintSource } from "./types";

export async function getCatalogPrintDashboard(): Promise<CatalogPrintDashboard> {
  const supabase = createServerSupabaseClient();
  const [settingsResult, categoriesResult, entriesResult, imagesResult, reviewsResult] = await Promise.all([
    supabase.from("catalog_print_settings").select("*").eq("id", 1).single(),
    supabase.from("catalog_print_categories").select("*").order("section").order("sort_order").order("name"),
    supabase.from("catalog_print_entries").select("*").order("section").order("sort_order").order("title"),
    supabase.from("catalog_print_entry_images").select("*").order("sort_order"),
    supabase.from("catalog_print_ficha_reviews").select("ficha_id"),
  ]);

  const firstError = [settingsResult.error, categoriesResult.error, entriesResult.error, imagesResult.error, reviewsResult.error].find(Boolean);
  if (firstError) throw firstError;
  if (!settingsResult.data) throw new Error("Configurações do catálogo não encontradas.");

  const entries = (entriesResult.data ?? []).map((entry) => ({
    ...entry,
    category: categoriesResult.data?.find((category) => category.id === entry.category_id) ?? null,
    images: (imagesResult.data ?? []).filter((image) => image.entry_id === entry.id),
  })) as CatalogPrintEntry[];

  const reviewedIds = (reviewsResult.data ?? []).map((item) => item.ficha_id);
  let sourceQuery = supabase.from("fichas")
    .select("id,arte,material,created_at,ficha_itens(produto),ficha_imagens(id,url,alt_text,width,height)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(40);
  if (reviewedIds.length) sourceQuery = sourceQuery.not("id", "in", `(${reviewedIds.join(",")})`);
  const sourceResult = await sourceQuery;
  if (sourceResult.error) throw sourceResult.error;

  const pendingSources: CatalogPrintSource[] = (sourceResult.data ?? []).map((source) => ({
    arte: source.arte,
    created_at: source.created_at,
    entryCount: entries.filter((entry) => entry.source_ficha_id === source.id).length,
    id: source.id,
    images: source.ficha_imagens ?? [],
    material: source.material,
    products: [...new Set((source.ficha_itens ?? []).map((item) => item.produto?.trim()).filter((value): value is string => Boolean(value)))],
  }));

  let publication: CatalogPrintDashboard["publication"] = null;
  if (settingsResult.data.latest_publication_id) {
    const { data: publicationData } = await supabase.from("catalog_print_publications").select("*").eq("id", settingsResult.data.latest_publication_id).maybeSingle();
    if (publicationData) {
      const { data: author } = publicationData.generated_by_user_id ? await supabase.from("app_users").select("display_name").eq("id", publicationData.generated_by_user_id).maybeSingle() : { data: null };
      publication = { ...publicationData, generatedByName: author?.display_name ?? null };
    }
  }
  return {
    categories: categoriesResult.data ?? [],
    entries,
    pendingSourceCount: sourceResult.count ?? pendingSources.length,
    pendingSources,
    publication,
    settings: settingsResult.data,
  };
}

export async function getCatalogPrintEntry(id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("catalog_print_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const images = await supabase.from("catalog_print_entry_images").select("*").eq("entry_id", id).order("sort_order");
  if (images.error) throw images.error;
  return { ...data, images: images.data ?? [] } as CatalogPrintEntry;
}

export async function getCatalogPrintSource(id: string) {
  const { data, error } = await createServerSupabaseClient().from("fichas")
    .select("id,arte,material,composicao,manga,gola,acabamento_manga,acabamento_gola,bolso,ficha_itens(produto,detalhes_produto),ficha_imagens(id,url,alt_text,width,height)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
