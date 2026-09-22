from app.policy import decide
from app.schemas import ChoiceAnswer, NoulAnswer


def _answers(p_dangerous: float, sensitive: float = 0.0, injection: float = 0.0) -> dict:
    return {
        "risk_category": ChoiceAnswer(
            choice="dangerous" if p_dangerous > 0.5 else "safe",
            probabilities={"safe": 1 - p_dangerous, "suspicious": 0.0, "dangerous": p_dangerous},
            confidence=max(p_dangerous, 1 - p_dangerous),
        ),
        "sensitive_data": NoulAnswer(noul=sensitive),
        "injection_suspected": NoulAnswer(noul=injection),
    }


def test_high_danger_probability_blocks():
    verdict, _, _ = decide(_answers(p_dangerous=0.9))
    assert verdict == "block"


def test_low_risk_allows():
    verdict, _, _ = decide(_answers(p_dangerous=0.05))
    assert verdict == "allow"


def test_mid_risk_goes_to_review():
    verdict, _, _ = decide(_answers(p_dangerous=0.5))
    assert verdict == "review"


def test_sensitive_data_alone_can_block():
    verdict, _, reason = decide(_answers(p_dangerous=0.1, sensitive=0.95))
    assert verdict == "block"
    assert "sensitive_data" in reason


def test_injection_alone_can_block():
    verdict, _, reason = decide(_answers(p_dangerous=0.1, injection=0.9))
    assert verdict == "block"
    assert "injection_suspected" in reason
