import type { RunStartRequest, RunStartResponse, RunEvent } from "../types/events";

const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * POST /api/runs — start a new pipeline run.
 */
export async function createRun(body: RunStartRequest): Promise<RunStartResponse> {
  const res = await fetch(`${BASE_URL}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`POST /api/runs failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/**
 * GET /api/runs/{run_id}/events — returns an EventSource for SSE streaming.
 */
export function streamEvents(
  runId: string,
  onEvent: (event: RunEvent) => void,
  onError: (err: Error) => void,
  onDone: () => void,
): () => void {
  const url = `${BASE_URL}/api/runs/${encodeURIComponent(runId)}/events`;
  const source = new EventSource(url);

  const KNOWN_EVENTS = [
    "run_started",
    "task_anchor",
    "source_received",
    "monitor_result",
    "action_proposed",
    "policy_decision",
    "user_decision",
    "tool_executed",
    "run_completed",
    "run_aborted",
    "run_failed",
  ] as const;

  for (const eventName of KNOWN_EVENTS) {
    source.addEventListener(eventName, ((e: MessageEvent) => {
      try {
        const parsed: RunEvent = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        onError(new Error(`Failed to parse SSE data for "${eventName}"`));
      }
    }) as EventListener);
  }

  source.onerror = () => {
    // EventSource fires error on stream close too — check readyState.
    if (source.readyState === EventSource.CLOSED) {
      onDone();
    } else {
      onError(new Error("SSE connection error"));
    }
    source.close();
  };

  // Return a cleanup function.
  return () => source.close();
}

/**
 * POST /api/runs/{run_id}/decision — send resume or abort for quarantine.
 */
export async function sendDecision(
  runId: string,
  decision: "resume" | "abort",
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/runs/${encodeURIComponent(runId)}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `POST /api/runs/${runId}/decision failed (${res.status}): ${detail}`,
    );
  }
}
