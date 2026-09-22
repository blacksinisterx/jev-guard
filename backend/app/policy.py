from .schemas import Answer, ChoiceAnswer, NoulAnswer

BLOCK_ABOVE = 0.75
ALLOW_BELOW = 0.25


def decide(answers: dict[str, Answer], block_above: float = BLOCK_ABOVE, allow_below: float = ALLOW_BELOW) -> tuple[str, float, str]:
    """Combine Jev's risk_category / sensitive_data / injection_suspected answers
    into a final allow|review|block verdict. Returns (verdict, confidence, reason)."""
    risk_category = answers.get("risk_category")
    sensitive = answers.get("sensitive_data")
    injection = answers.get("injection_suspected")

    signals: list[tuple[float, str]] = []
    if isinstance(risk_category, ChoiceAnswer):
        p_dangerous = risk_category.probabilities.get("dangerous", 0.0)
        signals.append((p_dangerous, f"risk_category={risk_category.choice} (p={p_dangerous:.2f})"))
    if isinstance(sensitive, NoulAnswer):
        signals.append((sensitive.noul, f"sensitive_data probability={sensitive.noul:.2f}"))
    if isinstance(injection, NoulAnswer):
        signals.append((injection.noul, f"injection_suspected probability={injection.noul:.2f}"))

    if not signals:
        return "review", 0.0, "no Jev signals available"

    risk, reason = max(signals, key=lambda s: s[0])
    # Confidence tracks whichever signal actually drove the verdict, not always
    # risk_category's own confidence — a block triggered by a high injection_suspected
    # probability should report that probability, not an unrelated number.
    confidence = risk if risk >= 0.5 else 1 - risk

    if risk >= block_above:
        return "block", confidence, reason
    if risk <= allow_below:
        return "allow", confidence, reason
    return "review", confidence, reason
