import { useEffect, useState } from "react";
import { evaluateAction, getDecisions, getExamples } from "./api";
import type { ActionRequest, DemoExample, EvaluationResult } from "./types";

const VERDICT_STYLE: Record<string, string> = {
  allow: "bg-emerald-100 text-emerald-800 border-emerald-300",
  review: "bg-amber-100 text-amber-800 border-amber-300",
  block: "bg-red-100 text-red-800 border-red-300",
};

function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${VERDICT_STYLE[verdict] ?? ""}`}>
      {verdict.toUpperCase()}
    </span>
  );
}

function ResultPanel({ result }: { result: EvaluationResult }) {
  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={result.verdict} />
        <span className="text-xs text-gray-500">
          {result.source === "rule" ? "decided by hard rule" : `decided by Jev (${result.provider})`}
        </span>
      </div>
      <p className="text-gray-800">{result.reason}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
        <dt>Confidence</dt>
        <dd>{(result.confidence * 100).toFixed(1)}%</dd>
        <dt>Latency</dt>
        <dd>{result.latency_ms.toFixed(2)} ms</dd>
        <dt>Cost estimate</dt>
        <dd>${result.cost_estimate_usd.toFixed(8)}</dd>
        <dt>Tool</dt>
        <dd className="font-mono">{result.action.tool}</dd>
      </dl>
      {Object.keys(result.raw_answers).length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">raw Jev answers</summary>
          <pre className="mt-1 overflow-x-auto">{JSON.stringify(result.raw_answers, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export default function App() {
  const [examples, setExamples] = useState<DemoExample[]>([]);
  const [decisions, setDecisions] = useState<EvaluationResult[]>([]);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState({ tool: "shell", params: '{"command": ""}', context: "" });

  useEffect(() => {
    getExamples().then(setExamples).catch(() => {});
    getDecisions().then(setDecisions).catch(() => {});
  }, []);

  async function runAction(action: ActionRequest) {
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateAction(action);
      setResult(res);
      setDecisions((prev) => [res, ...prev].slice(0, 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : "evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  function runCustom() {
    let params: Record<string, unknown>;
    try {
      params = JSON.parse(custom.params);
    } catch {
      setError("params must be valid JSON");
      return;
    }
    runAction({ tool: custom.tool, params, context: custom.context || null });
  }

  const grouped = examples.reduce<Record<string, DemoExample[]>>((acc, ex) => {
    (acc[ex.category] ??= []).push(ex);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">JevGuard</h1>
        <p className="text-sm text-gray-500">A security decision layer for AI agents — agent proposes an action, Jev decides allow / review / block.</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div>
            <h2 className="font-semibold mb-2">Try a demo action</h2>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => runAction(ex.action)}
                      disabled={loading}
                      className="text-sm px-3 py-1.5 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 font-mono"
                    >
                      {ex.action.tool}: {JSON.stringify(ex.action.params).slice(0, 40)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="font-semibold mb-2">Or propose your own</h2>
            <div className="space-y-2 bg-white border rounded-lg p-4">
              <input
                className="w-full border rounded px-2 py-1 text-sm font-mono"
                value={custom.tool}
                onChange={(e) => setCustom({ ...custom, tool: e.target.value })}
                placeholder="tool name"
              />
              <textarea
                className="w-full border rounded px-2 py-1 text-sm font-mono"
                rows={2}
                value={custom.params}
                onChange={(e) => setCustom({ ...custom, params: e.target.value })}
                placeholder='{"command": "..."}'
              />
              <textarea
                className="w-full border rounded px-2 py-1 text-sm"
                rows={2}
                value={custom.context}
                onChange={(e) => setCustom({ ...custom, context: e.target.value })}
                placeholder="optional surrounding context"
              />
              <button
                onClick={runCustom}
                disabled={loading}
                className="px-4 py-1.5 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
              >
                Evaluate
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && <ResultPanel result={result} />}
        </section>

        <section>
          <h2 className="font-semibold mb-2">Recent decisions</h2>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2">Verdict</th>
                  <th className="px-3 py-2">Tool</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">
                      <VerdictBadge verdict={d.verdict} />
                    </td>
                    <td className="px-3 py-2 font-mono">{d.action.tool}</td>
                    <td className="px-3 py-2 text-gray-500">{d.source}</td>
                    <td className="px-3 py-2">{(d.confidence * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-gray-500">{d.latency_ms.toFixed(1)}ms</td>
                  </tr>
                ))}
                {decisions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                      No decisions yet — try a demo action.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
