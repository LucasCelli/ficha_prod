"use client";

import { useEffect } from "react";
import { printFichaAutomatically } from "./print-pdf";

const PRINT_JOB_SIGNAL = "ficha:print-dialog-opened";

export function PrintOnLoad() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("autoprint") === "0") {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      const element = document.getElementById("print-version");
      if (!element) {
        return;
      }

      try {
        await printFichaAutomatically(element, () => {
          if (window.parent !== window) window.frameElement?.remove();
        });
        notifyParentPrintReady(searchParams.get("_printJob"));
      } catch (error) {
        console.error("Error preparing print:", error);
        notifyParentPrintReady(searchParams.get("_printJob"));
        window.print();
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}

function notifyParentPrintReady(printJobId: string | null) {
  if (!printJobId || window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      printJobId,
      type: PRINT_JOB_SIGNAL,
    },
    window.location.origin,
  );
}
