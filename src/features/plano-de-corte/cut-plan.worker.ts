import { calculateCutPlanAlternatives, type CutPlanAlternative } from "./alternatives.ts";
import type { CutPlanInput } from "./model.ts";

export type CutPlanWorkerMessage =
  | { type: "progress" | "complete"; alternatives: CutPlanAlternative[] }
  | { type: "error"; message: string };

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<CutPlanInput>) => void;
  postMessage: (message: CutPlanWorkerMessage) => void;
};

scope.onmessage = ({ data }) => {
  try {
    const alternatives = calculateCutPlanAlternatives(data, {
      onProgress: (alternatives) => scope.postMessage({ type: "progress", alternatives }),
    });
    scope.postMessage({ type: "complete", alternatives });
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : "Não foi possível calcular o plano." });
  }
};
