import json
from dataclasses import dataclass

from app.schemas.actions import ActionProposal
from app.schemas.events import PolicyDecision


@dataclass(frozen=True)
class GateResult:
    decision: PolicyDecision
    reason: str
    hard_block: bool = False


def evaluate_action(
    *,
    action: ActionProposal | None = None,
    risk_score: int,
    monitor_decision: PolicyDecision | str,
    canary_secret: str | None = None,
) -> GateResult:
    """Choose whether a proposed action or preflight task may proceed."""

    if not 0 <= risk_score <= 100:
        return GateResult(
            decision=PolicyDecision.BLOCK,
            reason="Invalid risk score; blocked by the policy gate.",
            hard_block=True,
        )

    try:
        monitor_decision = PolicyDecision(monitor_decision)
    except ValueError:
        return GateResult(
            decision=PolicyDecision.BLOCK,
            reason="Unknown monitor decision; blocked by the policy gate.",
            hard_block=True,
        )

    if action is not None:
        action_text = json.dumps(
            action.model_dump(mode="json"),
            ensure_ascii=False,
        ).casefold()

        if canary_secret and canary_secret.casefold() in action_text:
            return GateResult(
                decision=PolicyDecision.BLOCK,
                reason="The outbound action contains the canary secret.",
                hard_block=True,
            )

    if monitor_decision == PolicyDecision.BLOCK or risk_score >= 70:
        return GateResult(
            decision=PolicyDecision.BLOCK,
            reason=(
                "The action exceeded the block threshold."
                if action is not None
                else "The task exceeded the block threshold in preflight."
            ),
        )

    if monitor_decision == PolicyDecision.QUARANTINE or risk_score >= 40:
        return GateResult(
            decision=PolicyDecision.QUARANTINE,
            reason=(
                "The action requires user review before execution."
                if action is not None
                else "The task requires user review before proceeding."
            ),
        )

    return GateResult(
        decision=PolicyDecision.ALLOW,
        reason=(
            "The monitor and policy gate allow this action."
            if action is not None
            else "The monitor and policy gate allow this task to proceed."
        ),
    )