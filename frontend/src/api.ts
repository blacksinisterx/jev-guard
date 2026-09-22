import type { ActionRequest, DemoExample, EvaluationResult } from "./types";

const BASE = "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const evaluateAction = (action: ActionRequest) =>
  fetch(`${BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  }).then((r) => json<EvaluationResult>(r));

export const getDecisions = () => fetch(`${BASE}/decisions`).then((r) => json<EvaluationResult[]>(r));

export const getExamples = () => fetch(`${BASE}/examples`).then((r) => json<DemoExample[]>(r));
