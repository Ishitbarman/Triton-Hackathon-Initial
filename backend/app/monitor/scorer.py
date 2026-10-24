
import json

from app.schemas.monitor import (
    MonitorInput,
    MonitorFinding,
    MonitorResult,
)
from app.monitor.detector import detect_threats


# Initial deterministic scoring weights.
# These weights are implementation choices, not specified by the PDF.
SIGNAL_WEIGHTS = {
    "direct_override": 45,
    "indirect_instruction": 45,
    "tool_redirection": 35,
    "multi_turn_pattern": 30,
}


def _decision_for_score(score: int) -> str:
    """Apply the agreed AGENTSHIELD risk thresholds."""
    if score >= 70:
        return "block"
    if score >= 40:
        return "quarantine"
    return "allow"


def _contains_canary(value, secret: str) -> bool:
    """Search nested action arguments for the configured canary."""
    if isinstance(value, str):
        return secret in value

    if isinstance(value, dict):
        return any(
            _contains_canary(item, secret)
            for item in value.values()
        )

    if isinstance(value, (list, tuple)):
        return any(
            _contains_canary(item, secret)
            for item in value
        )

    return False


def _is_outbound_action(request: MonitorInput) -> bool:
    """
    Recognize explicit outbound flags and known outbound tool names.

    Confirm the tool names with Member 4 before integration.
    """
    if request.outbound_action:
        return True

    action = request.proposed_action

    if not isinstance(action, dict):
        return False

    tool = str(action.get("tool", "")).strip().lower()

    outbound_tools = {
        "send",
        "send_email",
        "email",
        "webhook",
        "http_post",
        "upload",
    }

    return tool in outbound_tools


def assess_action(request: MonitorInput) -> MonitorResult:
    """
    Detect threats, calculate risk, and return a decision.

    The backend must enforce this decision before executing a tool.
    """
    findings = detect_threats(request)

    # Count each signal category once.
    signals = {
        finding.signal
        for finding in findings
    }

    action_text = json.dumps(
        request.proposed_action,
        ensure_ascii=False,
        default=str,
    )

    # Mandatory hard stop for a canary in an outbound action.
    # This overrides ordinary scoring and model assessment.
    if (
        _is_outbound_action(request)
        and request.canary_secret
        and _contains_canary(
            request.proposed_action,
            request.canary_secret,
        )
    ):
        findings.append(
            MonitorFinding(
                signal="canary_secret_outbound",
                evidence=(
                    "Configured canary secret detected in outbound action."
                ),
                source=request.source or "proposed_action",
            )
        )

        signals.add("canary_secret_outbound")

        return MonitorResult(
            risk_score=100,
            decision="block",
            detected_signals=sorted(signals),
            findings=findings,
            relevant_text=action_text,
            explanation=(
                "BLOCKED: the outbound action contains the configured "
                "canary secret. This hard stop overrides the ordinary "
                "risk score."
            ),
        )

    # Deterministic risk scoring.
    score = min(
        100,
        sum(
            SIGNAL_WEIGHTS.get(signal, 0)
            for signal in signals
        ),
    )

    decision = _decision_for_score(score)

    if findings:
        explanation = "; ".join(
            f"{finding.signal}: {finding.evidence}"
            for finding in findings
        )
    else:
        explanation = (
            "No configured threat patterns were detected. "
            "This does not guarantee that the action is safe."
        ) 

    if decision == "quarantine":
        explanation += " Action requires user resume or abort."
    elif decision == "block":
        explanation += " Action must not execute."
    else:
        explanation += " Action passes the deterministic risk threshold."

    return MonitorResult(
        risk_score=score,
        decision=decision,
        detected_signals=sorted(signals),
        findings=findings,
        relevant_text=(
            action_text if findings else request.current_turn
        ),
        explanation=explanation,
    )

