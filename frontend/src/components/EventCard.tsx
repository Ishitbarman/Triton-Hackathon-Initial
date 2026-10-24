import React from "react";
import type { RunEvent, PolicyDecision } from "../types/events";

/* ── colour helpers ─────────────────────────────────────────────── */

const DECISION_COLORS: Record<PolicyDecision, string> = {
  allow: "#22c55e",
  quarantine: "#eab308",
  block: "#ef4444",
};

function riskColor(score: number | null | undefined): string {
  if (score == null) return "#94a3b8";
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

const TYPE_LABELS: Record<string, string> = {
  run_started: "🚀 Run Started",
  task_anchor: "📌 Task Anchor",
  source_received: "📄 Source Received",
  action_proposed: "🤖 Proposed Action",
  monitor_result: "🔍 Monitor Result",
  policy_decision: "⚖️ Policy Decision",
  user_decision: "👤 User Decision",
  tool_executed: "🔧 Tool Executed",
  run_completed: "✅ Run Completed",
  run_aborted: "🛑 Run Aborted",
  run_failed: "❌ Run Failed",
};

/* ── component ──────────────────────────────────────────────────── */

interface Props {
  event: RunEvent;
}

const EventCard: React.FC<Props> = ({ event }) => {
  const label = TYPE_LABELS[event.event_type] ?? event.event_type;
  const isTerminal = ["run_completed", "run_aborted", "run_failed"].includes(
    event.event_type,
  );

  let formattedRelevantText = event.relevant_text;
  if (event.relevant_text) {
    try {
      const parsed = JSON.parse(event.relevant_text);
      if (typeof parsed === "object" && parsed !== null) {
        formattedRelevantText = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // not JSON, keep as is
    }
  }

  return (
    <div style={styles.card(isTerminal)}>
      {/* header row */}
      <div style={styles.header}>
        <span style={styles.label}>{label}</span>
        <span style={styles.step}>step {event.step}</span>
      </div>

      {/* source & trust */}
      {event.source && (
        <div style={styles.row}>
          <span style={styles.dim}>source:</span>{" "}
          <code style={styles.code}>{event.source}</code>
          {event.trust_label && event.trust_label !== "none" && (
            <span
              style={{
                ...styles.badge,
                backgroundColor:
                  event.trust_label === "trusted" ? "#22c55e33" : "#ef444433",
                color:
                  event.trust_label === "trusted" ? "#16a34a" : "#dc2626",
              }}
            >
              {event.trust_label}
            </span>
          )}
        </div>
      )}

      {/* relevant text / tool result */}
      {formattedRelevantText && (
        <div>
          {event.event_type === "tool_executed" && (
            <div style={{ ...styles.dim, fontSize: 12, marginBottom: 4 }}>
              Tool Execution Result:
            </div>
          )}
          {event.event_type === "task_anchor" && (
            <div style={{ ...styles.dim, fontSize: 12, marginBottom: 4 }}>
              Task Anchor:
            </div>
          )}
          {event.event_type === "source_received" && (
            <div style={{ ...styles.dim, fontSize: 12, marginBottom: 4 }}>
              Retrieved Content:
            </div>
          )}
          <pre style={styles.pre}>{formattedRelevantText}</pre>
        </div>
      )}

      {/* proposed action */}
      {event.proposed_action && (
        <div style={styles.actionBox}>
          <div style={styles.row}>
            <span style={styles.dim}>tool:</span>{" "}
            <strong>{event.proposed_action.tool_name}</strong>
          </div>
          <div style={styles.row}>
            <span style={styles.dim}>purpose:</span>{" "}
            {event.proposed_action.purpose}
          </div>
          <pre style={styles.pre}>
            {JSON.stringify(event.proposed_action.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* risk score */}
      {event.risk_score != null && (
        <div style={styles.row}>
          <span style={styles.dim}>risk score:</span>{" "}
          <strong style={{ color: riskColor(event.risk_score) }}>
            {event.risk_score}
          </strong>
          <span style={styles.dim}> / 100</span>
        </div>
      )}

      {/* detected signals */}
      {event.detected_signals && event.detected_signals.length > 0 && (
        <div style={styles.row}>
          <span style={styles.dim}>signals:</span>{" "}
          {event.detected_signals.map((s) => (
            <span key={s} style={styles.signalBadge}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* decision */}
      {event.decision && (
        <div style={styles.row}>
          <span style={styles.dim}>decision:</span>{" "}
          <span
            style={{
              ...styles.badge,
              backgroundColor:
                (DECISION_COLORS[event.decision] ?? "#64748b") + "25",
              color: DECISION_COLORS[event.decision] ?? "#64748b",
              fontWeight: 700,
            }}
          >
            {event.decision.toUpperCase()}
          </span>
        </div>
      )}

      {/* explanation */}
      {event.explanation && (
        <div style={{ ...styles.row, ...styles.dim, fontStyle: "italic" }}>
          {event.explanation}
        </div>
      )}
    </div>
  );
};

/* ── styles ─────────────────────────────────────────────────────── */

const styles = {
  card: (isTerminal: boolean): React.CSSProperties => ({
    background: isTerminal ? "#1e293b" : "#0f172a",
    border: `1px solid ${isTerminal ? "#334155" : "#1e293b"}`,
    borderRadius: 10,
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  }),
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  label: {
    fontWeight: 700,
    fontSize: 15,
    color: "#e2e8f0",
  } as React.CSSProperties,
  step: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
  } as React.CSSProperties,
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    fontSize: 14,
    color: "#cbd5e1",
  } as React.CSSProperties,
  dim: { color: "#64748b" } as React.CSSProperties,
  code: {
    background: "#1e293b",
    padding: "2px 6px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 13,
    color: "#93c5fd",
  } as React.CSSProperties,
  pre: {
    background: "#020617",
    padding: "8px 12px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 12,
    color: "#94a3b8",
    overflowX: "auto",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  } as React.CSSProperties,
  badge: {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
  signalBadge: {
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    background: "#fbbf2420",
    color: "#facc15",
  } as React.CSSProperties,
  actionBox: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  } as React.CSSProperties,
};

export default EventCard;
