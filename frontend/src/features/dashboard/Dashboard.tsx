import React, { useState, useRef, useEffect } from "react";
import type { RunEvent, Provider } from "../../types/events";
import { createRun, streamEvents, sendDecision } from "../../api/client";
import RunControls from "../../components/RunControls";
import EventTimeline from "../../components/EventTimeline";

type RunStatus =
  | "idle"
  | "starting"
  | "running"
  | "awaiting_decision"
  | "completed"
  | "aborted"
  | "failed";

export const Dashboard: React.FC = () => {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Keep a ref to the cleanup function of the current stream
  const cleanupStreamRef = useRef<(() => void) | null>(null);

  // Clean up SSE stream on unmount
  useEffect(() => {
    return () => {
      cleanupStreamRef.current?.();
    };
  }, []);

  const handleStartRun = async (
    task: string,
    scenarioId: string | null,
    provider: Provider,
    untrustedContent: string | null = null,
    history: string[] | null = null,
  ) => {
    // Reset state for new run
    cleanupStreamRef.current?.();
    cleanupStreamRef.current = null;
    setError(null);
    setEvents([]);
    setStatus("starting");

    try {
      const resp = await createRun({
        task,
        scenario_id: scenarioId,
        provider,
        untrusted_content: untrustedContent,
        history,
      });

      const currentRunId = resp.run_id;
      setRunId(currentRunId);
      setStatus("running");

      // Start SSE stream
      const cleanup = streamEvents(
        currentRunId,
        (event: RunEvent) => {
          setEvents((prev) => [...prev, event]);

          // Update status based on event
          if (
            event.event_type === "policy_decision" &&
            event.decision === "quarantine"
          ) {
            setStatus("awaiting_decision");
          } else if (event.event_type === "run_completed") {
            setStatus("completed");
          } else if (event.event_type === "run_aborted") {
            setStatus("aborted");
          } else if (event.event_type === "run_failed") {
            setStatus("failed");
          }
        },
        (err: Error) => {
          // If the stream errors while not completed, show error
          setStatus((prev) => {
            if (["completed", "aborted", "failed"].includes(prev)) {
              return prev;
            }
            setError(`Stream error: ${err.message}`);
            return "failed";
          });
        },
        () => {
          // SSE stream closed cleanly
          setStatus((prev) => {
            if (prev === "running" || prev === "starting") {
              return "completed";
            }
            return prev;
          });
        },
      );

      cleanupStreamRef.current = cleanup;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("idle");
    }
  };

  const handleDecision = async (decision: "resume" | "abort") => {
    if (!runId) return;
    setDecisionLoading(true);
    setError(null);
    try {
      await sendDecision(runId, decision);
      // Backend will transition run status and emit events
      setStatus(decision === "resume" ? "running" : "aborted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to submit decision: ${msg}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  const isRunning = status === "starting" || status === "running";
  const isAwaitingDecision = status === "awaiting_decision";

  // Derive latest summary metrics from events
  const latestRiskScore = [...events]
    .reverse()
    .find((e) => e.risk_score != null)?.risk_score;
  const latestDecision = [...events]
    .reverse()
    .find((e) => e.decision != null)?.decision;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.logoShield}>🛡️</div>
          <div>
            <h1 style={styles.title}>AGENTSHIELD</h1>
            <p style={styles.subtitle}>
              Runtime AI Security Firewall — Monitor, Policy Gate, and Live Quarantine
            </p>
          </div>
        </div>

        {runId && (
          <div style={styles.runMeta}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>RUN ID:</span>
              <span style={styles.metaValue}>{runId}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>STATUS:</span>
              <span
                style={{
                  ...styles.statusPill,
                  backgroundColor: getStatusBg(status),
                  color: getStatusColor(status),
                }}
              >
                {status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            {latestRiskScore != null && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>RISK:</span>
                <span
                  style={{
                    ...styles.statusPill,
                    backgroundColor:
                      latestRiskScore >= 70
                        ? "#ef444430"
                        : latestRiskScore >= 40
                        ? "#eab30830"
                        : "#22c55e30",
                    color:
                      latestRiskScore >= 70
                        ? "#ef4444"
                        : latestRiskScore >= 40
                        ? "#eab308"
                        : "#22c55e",
                  }}
                >
                  {latestRiskScore} / 100
                </span>
              </div>
            )}
            {latestDecision && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>DECISION:</span>
                <span
                  style={{
                    ...styles.statusPill,
                    backgroundColor:
                      latestDecision === "allow"
                        ? "#22c55e30"
                        : latestDecision === "quarantine"
                        ? "#eab30830"
                        : "#ef444430",
                    color:
                      latestDecision === "allow"
                        ? "#22c55e"
                        : latestDecision === "quarantine"
                        ? "#eab308"
                        : "#ef4444",
                  }}
                >
                  {latestDecision.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      {error && (
        <div style={styles.errorBanner}>
          <div style={styles.errorContent}>
            <strong>⚠️ Error:</strong> {error}
          </div>
          <button
            onClick={() => setError(null)}
            style={styles.errorDismiss}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <main style={styles.mainGrid}>
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Run Configuration</h2>
          <RunControls
            onStartRun={handleStartRun}
            onResume={() => handleDecision("resume")}
            onAbort={() => handleDecision("abort")}
            isRunning={isRunning}
            isAwaitingDecision={isAwaitingDecision}
            decisionLoading={decisionLoading}
          />
        </section>

        <section style={{ ...styles.panel, flex: 2 }}>
          <div style={styles.timelineHeader}>
            <h2 style={styles.sectionTitle}>Live Event Timeline</h2>
            {events.length > 0 && (
              <span style={styles.eventCount}>{events.length} events</span>
            )}
          </div>
          <EventTimeline events={events} />
        </section>
      </main>
    </div>
  );
};

function getStatusBg(status: RunStatus): string {
  switch (status) {
    case "running":
    case "starting":
      return "#3b82f630";
    case "awaiting_decision":
      return "#eab30830";
    case "completed":
      return "#22c55e30";
    case "aborted":
      return "#ef444430";
    case "failed":
      return "#ef444430";
    default:
      return "#64748b30";
  }
}

function getStatusColor(status: RunStatus): string {
  switch (status) {
    case "running":
    case "starting":
      return "#60a5fa";
    case "awaiting_decision":
      return "#facc15";
    case "completed":
      return "#4ade80";
    case "aborted":
      return "#f87171";
    case "failed":
      return "#f87171";
    default:
      return "#94a3b8";
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#090d16",
    color: "#f1f5f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: "24px 32px",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 16,
    paddingBottom: 24,
    borderBottom: "1px solid #1e293b",
    marginBottom: 24,
  } as React.CSSProperties,
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  } as React.CSSProperties,
  logoShield: {
    fontSize: 36,
  } as React.CSSProperties,
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #60a5fa, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    margin: "4px 0 0 0",
  } as React.CSSProperties,
  runMeta: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#0f172a",
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #1e293b",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
  } as React.CSSProperties,
  metaLabel: {
    color: "#64748b",
    fontWeight: 700,
  } as React.CSSProperties,
  metaValue: {
    fontFamily: "monospace",
    color: "#cbd5e1",
  } as React.CSSProperties,
  statusPill: {
    padding: "3px 8px",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  errorBanner: {
    background: "#7f1d1d40",
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fca5a5",
    fontSize: 14,
  } as React.CSSProperties,
  errorContent: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  errorDismiss: {
    background: "none",
    border: "none",
    color: "#fca5a5",
    fontSize: 16,
    cursor: "pointer",
    padding: "0 4px",
  } as React.CSSProperties,
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 24,
    alignItems: "start",
  } as React.CSSProperties,
  panel: {
    background: "#0d1322",
    borderRadius: 12,
    border: "1px solid #1e293b",
    padding: 20,
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: "0 0 16px 0",
    color: "#e2e8f0",
  } as React.CSSProperties,
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  } as React.CSSProperties,
  eventCount: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
    background: "#1e293b",
    padding: "2px 8px",
    borderRadius: 4,
  } as React.CSSProperties,
};

export default Dashboard;
