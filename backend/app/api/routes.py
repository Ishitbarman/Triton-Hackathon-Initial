from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.orchestration.runner import (
    get_run,
    start_run,
    stream_events,
    submit_user_decision,
)
from app.schemas.requests import (
    RunStartRequest,
    RunStartResponse,
    UserDecisionRequest,
    UserDecisionResponse,
)

router = APIRouter(prefix="/api", tags=["runs"])


@router.post("/runs", response_model=RunStartResponse, status_code=202)
async def create_run(request: RunStartRequest) -> RunStartResponse:
    return start_run(request)


@router.get("/runs/{run_id}/events")
async def get_run_events(run_id: str) -> StreamingResponse:
    if get_run(run_id) is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    return StreamingResponse(
        stream_events(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/runs/{run_id}/decision",
    response_model=UserDecisionResponse,
)
async def decide_run(
    run_id: str,
    request: UserDecisionRequest,
) -> UserDecisionResponse:
    try:
        await submit_user_decision(run_id, request)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    status = "running" if request.decision == "resume" else "aborted"
    return UserDecisionResponse(
        run_id=run_id,
        decision=request.decision,
        status=status,
    )