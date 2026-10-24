/**
 * Mirrors the backend RunEvent schema from app/schemas/events.py.
 */

export type EventType =
  | "run_started"
  | "task_anchor"
  | "source_received"
  | "monitor_result"
  | "action_proposed"
  | "policy_decision"
  | "user_decision"
  | "tool_executed"
  | "run_completed"
  | "run_aborted"
  | "run_failed";

export type TrustLabel = "trusted" | "untrusted" | "none";

export type PolicyDecision = "allow" | "quarantine" | "block";

export interface ActionProposal {
  action_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  purpose: string;
  source_ids: string[];
}

export interface RunEvent {
  event_id: string;
  run_id: string;
  step: number;
  event_type: EventType;
  timestamp: string;
  source?: string | null;
  trust_label?: TrustLabel | null;
  relevant_text?: string | null;
  detected_signals?: string[];
  risk_score?: number | null;
  proposed_action?: ActionProposal | null;
  decision?: PolicyDecision | null;
  explanation?: string | null;
}

export type Provider = "scripted" | "live";

export interface RunStartRequest {
  task: string;
  scenario_id?: string | null;
  provider?: Provider | null;
  untrusted_content?: string | null;
  history?: string[] | null;
}

export interface RunStartResponse {
  run_id: string;
  status: string;
}
