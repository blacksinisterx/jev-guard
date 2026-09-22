# LinkedIn post draft — JevGuard

**Attach:** `demo.gif` as the primary media (GIFs autoplay in-feed and outperform static images). If LinkedIn's uploader down-converts it to video, that's fine. Use `dashboard.png` as a fallback single image if you'd rather post a static shot.

---

Most "AI agent guardrails" are either a hardcoded regex list (misses everything unexpected) or a full LLM call on every tool invocation (slow, expensive, and honestly overkill for "is this safe to run?").

I built **JevGuard** to try a third option: a security decision layer that sits between an agent and tool execution, using Jev — TypeSafe AI's new "System One" model — for the part that actually needs judgment.

How it works:
→ Hard-rule prefilter catches the obvious stuff for free (rm -rf /, DROP TABLE, fork bombs) — zero cost, zero latency
→ Everything ambiguous goes to Jev: 3 typed questions evaluated in parallel — risk category, sensitive-data exposure, and prompt-injection detection
→ A threshold policy turns those into allow / review / block, with the confidence shown tracking whichever signal actually drove the call

The part I found genuinely useful: Jev doesn't generate text, it returns typed, calibrated probabilities in under a second. That's the difference between "can I afford to check every tool call" and "I can only afford to check the ones a keyword filter already flagged."

The GIF shows it catching a dangerous shell command instantly (rule-based), then catching something a regex never would — a prompt-injection attempt dressed up as "the user already approved this" — with Jev assigning it an 0.81 injection probability and blocking it.

Built with FastAPI + a Vite/React/shadcn dashboard, fully runnable with zero API cost (mock provider matches Jev's real response schema exactly, so swapping in a live key is a one-line env change).

First of a small series exploring Jev as an actual architectural component rather than "add an LLM call because it's trendy." Repo + write-up: [link]

#AI #AIAgents #SecurityEngineering #BuildInPublic

---

**Notes for posting:**
- Swap `[link]` for the GitHub repo URL once it's pushed.
- If LinkedIn's image limit rejects the GIF (some accounts cap at ~8MB / short duration), `demo.gif` is 188KB / ~11s, well within range — should be fine.
- Consider a top comment with the tech stack breakdown if the post gets traction, keeps the main post punchy.
