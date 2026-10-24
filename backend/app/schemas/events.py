from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from .actions import ActionProposal


class EventType(str, Enum):
    RUN_STARTED = "run_started"
    TASK_ANCHOR = "task_anchor"
    SOURCE_RECEIVED = "source_received"
    MONITOR_RESULT = "monitor_result"
    ACTION_PROPOSED = "action_proposed"
    POLICY_DECISION = "policy_decision"
    USER_DECISION = "user_decision"
    TOOL_EXECUTED = "tool_executed"
    RUN_COMPLETED = "run_completed"
    RUN_ABORTED = "run_aborted"
    RUN_FAILED = "run_failed"


class TrustLabel(str, Enum):
    TRUSTED = "trusted"
    UNTRUSTED = "untrusted"
    NONE = "none"


class PolicyDecision(str, Enum):
    ALLOW = "allow"
    QUARANTINE = "quarantine"
    BLOCK = "block"


class RunEvent(BaseModel):
    """A single event shown in the live run timeline."""

    model_config = ConfigDict(extra="forbid")

    event_id: UUID = Field(default_factory=uuid4)
    run_id: str = Field(min_length=1)
    step: int = Field(ge=0)
    event_type: EventType
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    source: str | None = None
    trust_label: TrustLabel | None = None
    relevant_text: str | None = None
    detected_signals: list[str] = Field(default_factory=list)
    risk_score: int | None = Field(default=None, ge=0, le=100)
    proposed_action: ActionProposal | None = None
    decision: PolicyDecision | None = None
    explanation: str | None = None