import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CustomDatalistOption } from "@/components/ui";
import type { Json } from "@/lib/supabase/database.types";
import type { CatalogItem, CatalogKind } from "./types";
import { catalogKinds } from "./types";

export type CatalogosResult =
  | {
      itemsByKind: Record<CatalogKind, CatalogItem[]>;
      kind: "ok";
      total: number;
    }
  | {
      itemsByKind: Record<CatalogKind, CatalogItem[]>;
      kind: "not-configured";
      total: 0;
    }
  | {
      itemsByKind: Record<CatalogKind, CatalogItem[]>;
      kind: "error";
      message: string;
      total: 0;
    };

export type CatalogOptionsByKind = Record<CatalogKind, CustomDatalistOption[]>;

function getEmptyCatalogMap(): Record<CatalogKind, CatalogItem[]> {
  return catalogKinds.reduce(
    (itemsByKind, kind) => ({
      ...itemsByKind,
      [kind]: [],
    }),
    {} as Record<CatalogKind, CatalogItem[]>,
  );
}

function getEmptyOptionsMap(): CatalogOptionsByKind {
  return catalogKinds.reduce(
    (itemsByKind, kind) => ({
      ...itemsByKind,
      [kind]: [],
    }),
    {} as CatalogOptionsByKind,
  );
}

function getMetadataRecord(metadata: Json): Record<string, string> | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;

  const entries = Object.entries(metadata)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function isTechnicalAlias(value: string) {
  const alias = value.trim();

  return (
    !alias ||
    alias.includes("_") ||
    alias.includes("-") ||
    /^[a-z0-9]+$/.test(alias)
  );
}

function getCatalogOptionDetails(aliases: string[], metadata: Record<string, string> | undefined) {
  const details = [
    ...aliases.filter((alias) => !isTechnicalAlias(alias)),
    metadata?.composition,
  ].filter((value): value is string => Boolean(value?.trim()));

  return details.length ? Array.from(new Set(details)) : undefined;
}

export async function listCatalogItems(): Promise<CatalogosResult> {
  const itemsByKind = getEmptyCatalogMap();

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      itemsByKind,
      kind: "not-configured",
      total: 0,
    };
  }

  try {
    const { data, error } = await createServerSupabaseClient()
      .from("catalog_items")
      .select("*")
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return {
        itemsByKind,
        kind: "error",
        message: error.message,
        total: 0,
      };
    }

    (data ?? []).forEach((item) => {
      itemsByKind[item.kind].push(item);
    });

    return {
      itemsByKind,
      kind: "ok",
      total: data?.length ?? 0,
    };
  } catch (error) {
    return {
      itemsByKind,
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao consultar catálogos.",
      total: 0,
    };
  }
}

export async function listCatalogOptionsForFichaForm(): Promise<CatalogOptionsByKind> {
  const itemsByKind = getEmptyOptionsMap();

  if (!getSupabaseConfigStatus().hasServerConfig) {
    return itemsByKind;
  }

  try {
    const { data, error } = await createServerSupabaseClient()
      .from("catalog_items")
      .select("kind,name,aliases,metadata")
      .eq("active", true)
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return itemsByKind;

    (data ?? []).forEach((item) => {
      const metadata = getMetadataRecord(item.metadata);

      itemsByKind[item.kind].push({
        aliases: item.aliases,
        details: getCatalogOptionDetails(item.aliases, metadata),
        label: item.name,
        metadata,
        value: item.name,
      });
    });

    return itemsByKind;
  } catch {
    return itemsByKind;
  }
}
