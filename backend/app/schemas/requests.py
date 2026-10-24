from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RunStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str = Field(min_length=1)
    scenario_id: str | None = None


class RunStartResponse(BaseModel):
    run_id: str
    status: str


class UserDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["resume", "abort"]


class UserDecisionResponse(BaseModel):
    run_id: str
    decision: Literal["resume", "abort"]
    status: str