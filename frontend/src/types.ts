export interface ActionRequest {
  tool: string;
  params: Record<string, unknown>;
  context?: string | null;
}

export interface EvaluationResult {
  verdict: "allow" | "review" | "block";
  confidence: number;
  reason: string;
  source: "rule" | "model";
  latency_ms: number;
  cost_estimate_usd: number;
  provider: string;
  raw_answers: Record<string, unknown>;
  action: ActionRequest;
}

export interface DemoExample {
  category: string;
  action: ActionRequest;
}
