/** Um único prazo monotônico cobre a geração inteira, inclusive fallback e mesclagem. */
export const CUT_PLAN_SEARCH_DURATION_MS = 30_000;

export type SearchBudget = {
  startedAt: number;
  deadline: number;
  now: () => number;
  termination: "completed" | "time_limit" | "state_limit";
};

export class SearchInterrupted extends Error {}

export function createSearchBudget(durationMs = CUT_PLAN_SEARCH_DURATION_MS, now = () => performance.now()): SearchBudget {
  const startedAt = now();
  return { startedAt, deadline: startedAt + Math.max(0, Math.min(durationMs, CUT_PLAN_SEARCH_DURATION_MS)), now, termination: "completed" };
}

export function searchExpired(budget: SearchBudget) {
  if (budget.now() >= budget.deadline) budget.termination = "time_limit";
  return budget.termination !== "completed";
}

export function checkSearchBudget(budget: SearchBudget) {
  if (searchExpired(budget)) throw new SearchInterrupted();
}

/** Fatias impedem um tecido de consumir o prazo reservado aos seguintes. */
export function sliceSearchBudget(parent: SearchBudget, durationMs: number): SearchBudget {
  return { ...parent, deadline: Math.min(parent.deadline, parent.now() + Math.max(0, durationMs)), termination: "completed" };
}
