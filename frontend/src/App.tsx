import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge, type Verdict } from "@/components/status-badge";
import { StatTile } from "@/components/stat-tile";
import { VerdictDistribution } from "@/components/verdict-distribution";
import { useTheme } from "@/lib/use-theme";
import { evaluateAction, getDecisions, getExamples } from "./api";
import type { ActionRequest, DemoExample, EvaluationResult } from "./types";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function ResultCard({ result }: { result: EvaluationResult }) {
  const confidencePct = Math.round(result.confidence * 100);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Latest decision</CardTitle>
          <StatusBadge verdict={result.verdict} />
        </div>
        <CardDescription>
          {result.source === "rule" ? "Decided by the hard-rule prefilter" : `Decided by Jev (${result.provider})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{result.reason}</p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span className="font-mono text-foreground">{confidencePct}%</span>
          </div>
          <Progress value={confidencePct} />
        </div>

        <dl className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Latency</dt>
            <dd className="font-mono text-foreground">{result.latency_ms.toFixed(2)} ms</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cost</dt>
            <dd className="font-mono text-foreground">${result.cost_estimate_usd.toFixed(8)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tool</dt>
            <dd className="font-mono text-foreground truncate">{result.action.tool}</dd>
          </div>
        </dl>

        {Object.keys(result.raw_answers).length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="raw" className="border-none">
              <AccordionTrigger className="text-xs text-muted-foreground">Raw Jev answers</AccordionTrigger>
              <AccordionContent>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(result.raw_answers, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [examples, setExamples] = useState<DemoExample[]>([]);
  const [decisions, setDecisions] = useState<EvaluationResult[]>([]);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("mock");
  const [custom, setCustom] = useState({ tool: "shell", params: '{"command": ""}', context: "" });

  useEffect(() => {
    getExamples().then(setExamples).catch(() => {});
    getDecisions().then(setDecisions).catch(() => {});
    fetch("/api/health").then((r) => r.json()).then((d) => setProvider(d.provider)).catch(() => {});
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

  const grouped = useMemo(
    () =>
      examples.reduce<Record<string, DemoExample[]>>((acc, ex) => {
        (acc[ex.category] ??= []).push(ex);
        return acc;
      }, {}),
    [examples],
  );
  const categories = Object.keys(grouped);
  const [activeCategory, setActiveCategory] = useState<string>("");
  useEffect(() => {
    if (!activeCategory && categories.length > 0) setActiveCategory(categories[0]);
  }, [categories, activeCategory]);

  const stats = useMemo(() => {
    const total = decisions.length;
    const counts: Record<Verdict, number> = { allow: 0, review: 0, block: 0 };
    let latencySum = 0;
    let confidenceSum = 0;
    for (const d of decisions) {
      counts[d.verdict]++;
      latencySum += d.latency_ms;
      confidenceSum += d.confidence;
    }
    return {
      total,
      counts,
      blockRate: total ? (counts.block / total) * 100 : 0,
      avgLatency: total ? latencySum / total : 0,
      avgConfidence: total ? (confidenceSum / total) * 100 : 0,
    };
  }, [decisions]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">JevGuard</h1>
              <p className="text-xs text-muted-foreground">A security decision layer for AI agents</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground">
              provider: {provider}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Decisions" value={String(stats.total)} />
          <StatTile label="Block rate" value={`${stats.blockRate.toFixed(0)}%`} />
          <StatTile label="Avg latency" value={`${stats.avgLatency.toFixed(1)} ms`} />
          <StatTile label="Avg confidence" value={`${stats.avgConfidence.toFixed(0)}%`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Try a demo action</CardTitle>
                <CardDescription>Seeded scenarios covering the categories JevGuard is meant to catch.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="mb-3 h-auto flex-wrap">
                    {categories.map((c) => (
                      <TabsTrigger key={c} value={c} className="text-xs">
                        {c}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {categories.map((c) => (
                    <TabsContent key={c} value={c} className="flex flex-col gap-2">
                      {grouped[c].map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => runAction(ex.action)}
                          disabled={loading}
                          className="rounded-md border bg-card px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          <span className="text-muted-foreground">{ex.action.tool}:</span>{" "}
                          {JSON.stringify(ex.action.params)}
                        </button>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Propose your own</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tool">Tool</Label>
                  <Input id="tool" className="font-mono" value={custom.tool} onChange={(e) => setCustom({ ...custom, tool: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="params">Params (JSON)</Label>
                  <Textarea id="params" className="font-mono" rows={2} value={custom.params} onChange={(e) => setCustom({ ...custom, params: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="context">Context (optional)</Label>
                  <Textarea id="context" rows={2} value={custom.context} onChange={(e) => setCustom({ ...custom, context: e.target.value })} placeholder="Surrounding conversation context, if any" />
                </div>
                <Button onClick={runCustom} disabled={loading} className="w-full">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Evaluate
                </Button>
                {error && <p className="text-sm text-critical">{error}</p>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {result ? (
              <ResultCard result={result} />
            ) : (
              <Card className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
                Run a demo action to see a decision here.
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
            <VerdictDistribution counts={stats.counts} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Source
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="size-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>"rule" = free hard-rule prefilter, "model" = Jev call</TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <StatusBadge verdict={d.verdict} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.action.tool}</TableCell>
                    <TableCell className="text-muted-foreground">{d.source}</TableCell>
                    <TableCell className="font-mono text-xs">{(d.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.latency_ms.toFixed(1)}ms</TableCell>
                  </TableRow>
                ))}
                {decisions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No decisions yet — try a demo action.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
