"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CutPlanAlternative } from "./alternatives";
import type { CutPlanWorkerMessage } from "./cut-plan.worker";
import type { CutPlanInput } from "./model";
import { CUT_PLAN_SEARCH_DURATION_MS } from "./search-budget";

type Callbacks = {
  onProgress: (alternatives: CutPlanAlternative[]) => void;
  onComplete: (alternatives: CutPlanAlternative[]) => void;
  onError: (message: string) => void;
};

/** O worker é dono do cálculo; editar/desmontar invalida inclusive mensagens já enfileiradas. */
export function useCutPlanSearch() {
  const [calculating, setCalculating] = useState(false);
  const running = useRef<{ worker: Worker; timer: ReturnType<typeof setTimeout>; latest: CutPlanAlternative[]; callbacks: Callbacks; startedAt: number } | null>(null);
  const dispose = useCallback(() => {
    const task = running.current;
    running.current = null;
    if (task) { clearTimeout(task.timer); task.worker.terminate(); }
    return task;
  }, []);
  useEffect(() => () => { dispose(); }, [dispose]);

  const cancel = useCallback((keepResult = false, reason: "cancelled" | "time_limit" = "cancelled") => {
    const task = dispose();
    setCalculating(false);
    if (!task || !keepResult) return;
    if (!task.latest.length) {
      if (reason === "time_limit") task.callbacks.onError("O prazo terminou antes de concluir um plano. Reduza a quantidade de itens e tente novamente.");
      return;
    }
    task.callbacks.onComplete(task.latest.map((alternative) => ({ ...alternative, result: { ...alternative.result,
      search: { ...alternative.result.search!, status: "feasible", termination: reason, elapsedMs: performance.now() - task.startedAt } } })));
  }, [dispose]);

  const start = useCallback((input: CutPlanInput, callbacks: Callbacks) => {
    dispose();
    let worker: Worker;
    try { worker = new Worker(new URL("./cut-plan.worker.ts", import.meta.url), { type: "module" }); }
    catch { setCalculating(false); callbacks.onError("Não foi possível iniciar o cálculo. Recarregue a página e tente novamente."); return; }
    const timer = setTimeout(() => { if (running.current?.worker === worker) cancel(true, "time_limit"); }, CUT_PLAN_SEARCH_DURATION_MS);
    running.current = { worker, timer, latest: [], callbacks, startedAt: performance.now() };
    setCalculating(true);
    const fail = (message: string) => {
      if (running.current?.worker !== worker) return;
      dispose(); setCalculating(false); callbacks.onError(message);
    };
    worker.onerror = () => fail("Não foi possível concluir o cálculo. Tente novamente.");
    worker.onmessageerror = () => fail("Não foi possível ler o resultado do cálculo.");
    worker.onmessage = ({ data }: MessageEvent<CutPlanWorkerMessage>) => {
      const task = running.current;
      if (task?.worker !== worker) return;
      if (data.type === "error") { fail(data.message); return; }
      task.latest = data.alternatives;
      if (data.type === "progress") callbacks.onProgress(data.alternatives);
      else { dispose(); setCalculating(false); callbacks.onComplete(data.alternatives); }
    };
    worker.postMessage(input);
  }, [cancel, dispose]);
  return { calculating, start, cancel };
}
