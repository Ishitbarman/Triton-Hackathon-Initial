import React, { useEffect, useRef } from "react";
import type { RunEvent } from "../types/events";
import EventCard from "./EventCard";

interface Props {
  events: RunEvent[];
}

const EventTimeline: React.FC<Props> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div style={styles.empty}>
        No events yet. Start a run to see the live timeline.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* vertical line behind cards */}
      <div style={styles.line} />

      {events.map((evt) => (
        <div key={evt.event_id} style={styles.entry}>
          <div style={styles.dot} />
          <div style={styles.cardWrap}>
            <EventCard event={evt} />
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

/* ── styles ─────────────────────────────────────────────────────── */

const styles = {
  container: {
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    paddingLeft: 24,
  } as React.CSSProperties,
  line: {
    position: "absolute" as const,
    left: 7,
    top: 0,
    bottom: 0,
    width: 2,
    background: "#334155",
  } as React.CSSProperties,
  entry: {
    position: "relative" as const,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  } as React.CSSProperties,
  dot: {
    position: "absolute" as const,
    left: -20,
    top: 16,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#3b82f6",
    border: "2px solid #0f172a",
    zIndex: 1,
  } as React.CSSProperties,
  cardWrap: {
    flex: 1,
  } as React.CSSProperties,
  empty: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center" as const,
    padding: 32,
  } as React.CSSProperties,
};

export default EventTimeline;
