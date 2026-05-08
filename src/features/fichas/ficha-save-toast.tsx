"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import { clearCreateFichaDraftSnapshot } from "./ficha-draft-storage";

export function FichaSaveToast() {
  const searchParams = useSearchParams();
  const saved = searchParams.get("saved");

  useEffect(() => {
    if (saved === "created") {
      clearCreateFichaDraftSnapshot();
    }
  }, [saved]);

  return (
    <>
      <RouteToast messages={savedToastMessages} paramName="saved" />
      <RouteToast messages={fichaActionToastMessages} paramName="toast" />
    </>
  );
}

const savedToastMessages: Record<string, RouteToastMessage> = {
  created: {
    description: "A nova ficha foi salva com sucesso.",
    title: "Ficha salva",
    tone: "success",
  },
  updated: {
    description: "As alterações foram salvas com sucesso.",
    title: "Ficha atualizada",
    tone: "success",
  },
};

const fichaActionToastMessages: Record<string, RouteToastMessage> = {
  "ficha-deleted": {
    description: "A ficha foi removida da lista.",
    title: "Ficha removida",
    tone: "success",
  },
  "ficha-delivered": {
    description: "A ficha foi marcada como entregue.",
    title: "Ficha concluída",
    tone: "success",
  },
  "ficha-reverted": {
    description: "A ficha voltou para pendente.",
    title: "Ficha reaberta",
    tone: "warning",
  },
};
