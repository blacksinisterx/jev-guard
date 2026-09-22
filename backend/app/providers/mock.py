import hashlib
import json

from ..schemas import Answer, ChoiceAnswer, ChoiceQuestion, NoulAnswer, NoulQuestion, Question, ScoreAnswer, ScoreQuestion
from .base import Provider

DESTRUCTIVE = ["rm -rf", "drop table", "delete from", "truncate", "--no-preserve-root", "format c:", "del /f", "shred "]
SUSPICIOUS = ["curl ", "wget ", "| bash", "| sh", "chmod 777", "sudo ", "base64 -d", "eval(", "exec(",
              "push --force", "push -f", "--force-with-lease"]
SENSITIVE = ["/etc/shadow", "/etc/passwd", "id_rsa", ".ssh", "password", "credit card", "ssn", "api_key", "secret", "private key", ".env", "token"]
INJECTION = ["already approved", "ignore previous instructions", "ignore all previous", "trust me", "i am the admin",
             "disregard your instructions", "user said it's fine", "as the owner"]


def _blob(state: str | dict) -> str:
    text = state if isinstance(state, str) else json.dumps(state)
    return text.lower()


def _jitter(seed_text: str, low: float, high: float) -> float:
    """Deterministic per-input pseudo-randomness so repeated demo calls are stable,
    but different inputs don't all land on the exact same number."""
    digest = int(hashlib.sha256(seed_text.encode()).hexdigest(), 16)
    frac = (digest % 1000) / 1000
    return round(low + frac * (high - low), 3)


class MockProvider(Provider):
    """Local, zero-cost, zero-network stand-in for Jev. Keyword heuristics tuned for
    JevGuard's own question set (risk_category / sensitive_data / injection_suspected);
    unrecognized questions get a neutral low-risk default so it never crashes."""

    name = "mock"

    def evaluate(self, state: str | dict, questions: dict[str, Question]) -> dict[str, Answer]:
        blob = _blob(state)
        hits = {
            "destructive": any(kw in blob for kw in DESTRUCTIVE),
            "suspicious": any(kw in blob for kw in SUSPICIOUS),
            "sensitive": any(kw in blob for kw in SENSITIVE),
            "injection": any(kw in blob for kw in INJECTION),
        }
        answers: dict[str, Answer] = {}
        for qid, q in questions.items():
            if isinstance(q, ChoiceQuestion):
                answers[qid] = self._choice(qid, q, blob, hits)
            elif isinstance(q, NoulQuestion):
                answers[qid] = self._noul(qid, q, blob, hits)
            elif isinstance(q, ScoreQuestion):
                answers[qid] = self._score(qid, q, blob, hits)
        return answers

    def _choice(self, qid: str, q: ChoiceQuestion, blob: str, hits: dict) -> ChoiceAnswer:
        options = list(q.criteria.keys())
        if hits["destructive"]:
            top = next((o for o in options if "danger" in o.lower()), options[-1])
            top_p = _jitter(blob + qid, 0.75, 0.97)
        elif hits["suspicious"]:
            top = next((o for o in options if "suspic" in o.lower()), options[len(options) // 2])
            top_p = _jitter(blob + qid, 0.45, 0.75)
        else:
            top = next((o for o in options if "safe" in o.lower()), options[0])
            top_p = _jitter(blob + qid, 0.7, 0.95)
        remaining = round(1 - top_p, 3)
        others = [o for o in options if o != top]
        probabilities = {top: top_p}
        for i, o in enumerate(others):
            probabilities[o] = round(remaining / len(others), 3) if others else 0.0
        return ChoiceAnswer(choice=top, probabilities=probabilities, confidence=top_p)

    def _noul(self, qid: str, q: NoulQuestion, blob: str, hits: dict) -> NoulAnswer:
        signal = "sensitive" if "sensitive" in qid.lower() or "sensitive" in q.instructions.lower() else \
                 "injection" if "inject" in qid.lower() or "inject" in q.instructions.lower() else None
        if signal and hits[signal]:
            return NoulAnswer(noul=_jitter(blob + qid, 0.8, 0.97))
        if hits["destructive"] or hits["suspicious"]:
            return NoulAnswer(noul=_jitter(blob + qid, 0.3, 0.55))
        return NoulAnswer(noul=_jitter(blob + qid, 0.02, 0.15))

    def _score(self, qid: str, q: ScoreQuestion, blob: str, hits: dict) -> ScoreAnswer:
        levels = len(q.criteria)
        risky = hits["destructive"] or hits["sensitive"] or hits["injection"]
        idx = levels - 1 if risky else 0
        return ScoreAnswer(score=idx, legend={str(i): c for i, c in enumerate(q.criteria)},
                            confidence=_jitter(blob + qid, 0.6, 0.9))
