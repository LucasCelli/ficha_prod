"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function FichaSaveToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastHandledRef = useRef<string | null>(null);
  const savedState = searchParams.get("saved");

  useEffect(() => {
    if (!savedState || lastHandledRef.current === savedState) return;

    const title = savedState === "updated" ? "Ficha atualizada" : "Ficha salva";
    const description =
      savedState === "updated"
        ? "As alterações foram salvas com sucesso."
        : "A nova ficha foi salva com sucesso.";

    toast.success(title, { description });
    lastHandledRef.current = savedState;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("saved");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, savedState, searchParams]);

  return null;
}
