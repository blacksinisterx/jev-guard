import json
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .fixtures import DEMO_ACTIONS
from .policy import decide
from .providers import get_provider
from .questions import QUESTIONS
from .rules import check_hard_rules
from .schemas import ActionRequest, EvaluationResult

app = FastAPI(title="JevGuard", description="A security decision layer for AI agents.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_decisions: list[EvaluationResult] = []
_MAX_LOG = 50


def _action_text(action: ActionRequest) -> str:
    parts = [action.tool, json.dumps(action.params)]
    if action.context:
        parts.append(action.context)
    return "\n".join(parts)


@app.post("/evaluate", response_model=EvaluationResult)
def evaluate(action: ActionRequest) -> EvaluationResult:
    text = _action_text(action)
    start = time.perf_counter()

    hard = check_hard_rules(text)
    if hard:
        verdict, reason = hard
        result = EvaluationResult(
            verdict=verdict, confidence=1.0, reason=reason, source="rule",
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
            cost_estimate_usd=0.0, provider=config.JEV_PROVIDER, action=action,
        )
    else:
        provider = get_provider(config.JEV_PROVIDER)
        answers = provider.evaluate(text, QUESTIONS)
        verdict, confidence, reason = decide(answers, config.JEV_BLOCK_ABOVE, config.JEV_ALLOW_BELOW)
        input_tokens = max(len(text) // 4, 1)  # rough estimate for the cost display
        result = EvaluationResult(
            verdict=verdict, confidence=round(confidence, 3), reason=reason, source="model",
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
            cost_estimate_usd=provider.cost_estimate_usd(input_tokens),
            provider=config.JEV_PROVIDER, raw_answers=answers, action=action,
        )

    _decisions.insert(0, result)
    del _decisions[_MAX_LOG:]
    return result


@app.get("/decisions", response_model=list[EvaluationResult])
def decisions() -> list[EvaluationResult]:
    return _decisions


@app.get("/examples")
def examples() -> list[dict]:
    return [{"category": e["category"], "action": e["action"].model_dump()} for e in DEMO_ACTIONS]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "provider": config.JEV_PROVIDER}
