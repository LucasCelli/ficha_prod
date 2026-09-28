"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CutPlanAlternative } from "./alternatives";
import { CutPlanPrintSimple } from "./cut-plan-print-simple";
import type { CutPlanInput, CutPlanSourceFicha } from "./model";

export function CutPlanNativePrintLayer({ alternatives, input, sourceFichas, onPrinted }: { alternatives: CutPlanAlternative[]; input: CutPlanInput; sourceFichas: CutPlanSourceFicha[]; onPrinted: () => void }) {
  useEffect(() => {
    const handleAfterPrint = () => onPrinted();
    window.addEventListener("afterprint", handleAfterPrint);
    const printTimer = window.setTimeout(() => window.print(), 150);
    const cleanupTimer = window.setTimeout(onPrinted, 5_000);
    return () => { window.removeEventListener("afterprint", handleAfterPrint); window.clearTimeout(printTimer); window.clearTimeout(cleanupTimer); };
  }, [onPrinted]);
  return createPortal(<div className="cut-plan-native-print-root">{alternatives.map((alternative) => <CutPlanPrintSimple alternative={alternative} input={input} sourceFichas={sourceFichas} key={alternative.id} />)}</div>, document.body);
}
