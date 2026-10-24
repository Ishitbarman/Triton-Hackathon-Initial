from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ActionProposal(BaseModel):
    """A tool action proposed by the agent, before execution."""

    model_config = ConfigDict(extra="forbid")

    action_id: str = Field(min_length=1)
    tool_name: str = Field(min_length=1)
    arguments: dict[str, Any] = Field(default_factory=dict)
    purpose: str = Field(min_length=1)
    source_ids: list[str] = Field(default_factory=list)