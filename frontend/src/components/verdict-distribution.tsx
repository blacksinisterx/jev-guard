import type { Verdict } from "./status-badge";

const SEGMENTS: { verdict: Verdict; label: string; colorVar: string }[] = [
  { verdict: "allow", label: "Allow", colorVar: "var(--status-good)" },
  { verdict: "review", label: "Review", colorVar: "var(--status-warning)" },
  { verdict: "block", label: "Block", colorVar: "var(--status-critical)" },
];

export function VerdictDistribution({ counts }: { counts: Record<Verdict, number> }) {
  const total = counts.allow + counts.review + counts.block;

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {total === 0 ? null : (
          SEGMENTS.map((s, i) => {
            const pct = (counts[s.verdict] / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={s.verdict}
                title={`${s.label}: ${counts[s.verdict]} (${pct.toFixed(0)}%)`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: s.colorVar,
                  marginLeft: i === 0 ? 0 : "2px",
                }}
                className="h-full first:rounded-l-full last:rounded-r-full"
              />
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SEGMENTS.map((s) => (
          <span key={s.verdict} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.label} <span className="font-mono text-foreground">{counts[s.verdict]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
