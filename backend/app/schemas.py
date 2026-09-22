"""Pydantic models mirroring the real Jev HTTP API (docs.typesafe.ai/api.md) exactly,
so any Provider implementation is interchangeable without touching call sites."""

from typing import Literal, Union
from pydantic import BaseModel

# ---- Questions (request side) ----


class NoulQuestion(BaseModel):
    type: Literal["noul"] = "noul"
    instructions: str
    criteria: dict[str, str] | None = None  # {"true": ..., "false": ...}


class ChoiceQuestion(BaseModel):
    type: Literal["choice"] = "choice"
    instructions: str
    criteria: dict[str, str]  # option_key -> description, max 255 options


class ScoreQuestion(BaseModel):
    type: Literal["score"] = "score"
    instructions: str
    criteria: list[str]  # ordered level descriptions, 2-10 levels


Question = Union[NoulQuestion, ChoiceQuestion, ScoreQuestion]


class JevRequest(BaseModel):
    state: str | dict | list
    model: str = "jev-latest"
    questions: dict[str, Question]


# ---- Answers (response side) ----


class NoulAnswer(BaseModel):
    type: Literal["noul"] = "noul"
    noul: float  # 0-1


class ChoiceAnswer(BaseModel):
    type: Literal["choice"] = "choice"
    choice: str
    probabilities: dict[str, float]
    confidence: float


class ScoreAnswer(BaseModel):
    type: Literal["score"] = "score"
    score: float
    legend: dict[str, str] = {}
    probabilities: dict[str, float] = {}
    confidence: float


Answer = Union[NoulAnswer, ChoiceAnswer, ScoreAnswer]


class Usage(BaseModel):
    input_tokens: int
    output_tokens: int


class JevResponse(BaseModel):
    model: str
    answers: dict[str, Answer]
    usage: Usage


# ---- JevGuard's own API surface ----


class ActionRequest(BaseModel):
    tool: str
    params: dict
    context: str | None = None


class EvaluationResult(BaseModel):
    verdict: Literal["allow", "review", "block"]
    confidence: float
    reason: str
    source: Literal["rule", "model"]
    latency_ms: float
    cost_estimate_usd: float
    provider: str
    raw_answers: dict[str, Answer] = {}
    action: ActionRequest
