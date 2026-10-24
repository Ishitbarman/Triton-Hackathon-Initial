
import re

from app.schemas.monitor import MonitorInput, MonitorFinding


DIRECT_PATTERNS = [
    r"\bignore (all )?(previous|prior|above) instructions\b",
    r"\bdisregard (all )?(previous|prior|above) instructions\b",
    r"\bforget your (original )?task\b",
    r"\boverride (the )?(system|original) instructions\b",
]

INDIRECT_PATTERNS = [
    r"\bignore (the )?(user|original) (request|task|instructions)\b",
    r"\breveal (the )?(system prompt|secret|hidden instructions)\b",
    r"\bsend .*secret\b",
    r"\bexfiltrate\b",
]

TOOL_PATTERNS = [
    r"\bsend (it|this|the data|the secret)\b",
    r"\bforward .* to\b",
    r"\bcall .*tool\b",
    r"\bchange the recipient\b",
    r"\buse .*instead of\b",
]


def find_matches(text: str, patterns: list[str]) -> list[str]:
    """Find text fragments matching the configured patterns."""
    matches = []

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            fragment = match.group(0)
            if fragment not in matches:
                matches.append(fragment)

    return matches


def detect_threats(request: MonitorInput) -> list[MonitorFinding]:
    """Detect suspicious instructions and return supporting evidence."""
    findings = []
    current = request.current_turn
    history_text = "\n".join(request.history)

    for evidence in find_matches(current, DIRECT_PATTERNS):
        findings.append(
            MonitorFinding(
                signal="direct_override",
                evidence=evidence,
                source=request.source or "current_turn",
            )
        )

    if request.trust_label.lower() in {
        "untrusted", "untrusted_source", "external"
    }:
        for evidence in find_matches(current, INDIRECT_PATTERNS):
            findings.append(
                MonitorFinding(
                    signal="indirect_instruction",
                    evidence=evidence,
                    source=request.source or "unknown_source",
                )
            )

    tool_matches = find_matches(current, TOOL_PATTERNS)

    for evidence in tool_matches:
        findings.append(
            MonitorFinding(
                signal="tool_redirection",
                evidence=evidence,
                source=request.source or "current_turn",
            )
        )

    previous_override = bool(
        find_matches(history_text, DIRECT_PATTERNS)
    )

    if previous_override and tool_matches:
        findings.append(
            MonitorFinding(
                signal="multi_turn_pattern",
                evidence=(
                    "An earlier override-like instruction and current "
                    "tool-redirection language occur across turns."
                ),
                source="conversation_history",
            )
        )
 
    return findings
