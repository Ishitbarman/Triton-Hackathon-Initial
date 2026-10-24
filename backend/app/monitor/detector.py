
import re

from app.schemas.monitor import MonitorInput, MonitorFinding


DIRECT_PATTERNS = [
    r"\bignore (all )?(previous|prior|above) instructions\b",
    r"\bdisregard (all )?(previous|prior|above) instructions\b",
    r"\bforget your (original )?task\b",
    r"\boverride (the )?(system|original) instructions\b",
    (
        r"\b(bypass|disable|override|circumvent) (the"
        r" )?((safety|security) )?(restrictions?|guardrails?|filters?|rules?|policy|safety|security)\b"
    ),
    (
        r"\bwithout (any )?((safety|security) )?(restrictions?|guardrails?|filters?|rules?|policy|safety|security)\b"
    ),
]

EXFILTRATION_TARGETS = (
    r"(system prompt|hidden instructions?|credentials?|passwords?|api[ _-]?keys?|secrets?)"
)

INDIRECT_PATTERNS = [
    r"\bignore (the )?(user'?s?|original) (request|task|instructions)\b",
    (
        r"\b(reveal|show|print|leak|display|output|extract|dump|tell me|give"
        rf" me|send) (the |all |any |your |me |a )?{EXFILTRATION_TARGETS}\b"
    ),
    r"\bwhat (is|are) (your |the )?(system prompt|hidden instructions?)\b",
    r"\bsend .*?(secret|credential|password|api[ _-]?key)\b",
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
    """Detect suspicious instructions across task anchor, current turn, and history."""
    findings = []
    task = request.task_anchor or ""
    current = request.current_turn or ""
    history_text = "\n".join(request.history)

    # 1. Inspect task anchor for direct overrides and safety bypass attempts
    for evidence in find_matches(task, DIRECT_PATTERNS):
        findings.append(
            MonitorFinding(
                signal="direct_override",
                evidence=evidence,
                source="user_task",
            )
        )

    # 2. Inspect task anchor for requests to reveal or exfiltrate secrets / credentials / prompts
    for evidence in find_matches(task, INDIRECT_PATTERNS):
        findings.append(
            MonitorFinding(
                signal="indirect_instruction",
                evidence=evidence,
                source="user_task",
            )
        )

    # 3. Inspect current turn for direct overrides
    for evidence in find_matches(current, DIRECT_PATTERNS):
        findings.append(
            MonitorFinding(
                signal="direct_override",
                evidence=evidence,
                source=request.source or "current_turn",
            )
        )

    # 4. Inspect current turn for indirect instructions from untrusted sources
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

    # 5. Inspect current turn for tool redirection patterns
    tool_matches = find_matches(current, TOOL_PATTERNS)

    for evidence in tool_matches:
        findings.append(
            MonitorFinding(
                signal="tool_redirection",
                evidence=evidence,
                source=request.source or "current_turn",
            )
        )

    # 6. Inspect multi-turn cross-turn pattern (override in history + tool redirection in current turn)
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
