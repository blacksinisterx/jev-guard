import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type Verdict = "allow" | "review" | "block";

const CONFIG: Record<Verdict, { label: string; icon: typeof CheckCircle2; classes: string }> = {
  allow: { label: "Allow", icon: CheckCircle2, classes: "bg-good/10 text-good border-good/30" },
  review: { label: "Review", icon: AlertTriangle, classes: "bg-warning/10 text-warning border-warning/40" },
  block: { label: "Block", icon: ShieldAlert, classes: "bg-critical/10 text-critical border-critical/30" },
};

// Status color never carries meaning alone: icon + text label always ship together.
export function StatusBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { label, icon: Icon, classes } = CONFIG[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", classes, className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
