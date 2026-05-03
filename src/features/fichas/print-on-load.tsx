"use client";

import { useEffect } from "react";

export function PrintOnLoad() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoprint") === "0") {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
