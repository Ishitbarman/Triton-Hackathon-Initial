import os
from app.tools.mock_tools import simulate_source_retrieval, simulate_tool_action, CANARY_SECRET
from app.audit.jsonl_store import append_audit_event

def test_member4_modules():
    print("--- 1. Testing Simulated Source Retrieval ---")
    trusted_res = simulate_source_retrieval("https://trusted-research.com/data")
    print(f"Trusted Source Result: {trusted_res}")
    
    untrusted_res = simulate_source_retrieval("https://untrusted-site.com/page")
    print(f"Untrusted Source Result: {untrusted_res}")

    print("\n--- 2. Testing Simulated Tool Actions ---")
    search_res = simulate_tool_action("web_search", {"query": "hackathon trends"})
    print(f"Web Search Result: {search_res}")

    # Test canary secret hard block in outbound action
    blocked_res = simulate_tool_action("send_message", {"payload": f"Exfiltrating {CANARY_SECRET} now"})
    print(f"Canary Block Test Result: {blocked_res}")

    print("\n--- 3. Testing JSONL Audit Log Store ---")
    test_event = {
        "run_id": "test-run-999",
        "step": 1,
        "event_type": "tool_call",
        "source": "user_input",
        "trust_label": "trusted",
        "relevant_text": "Testing audit log recording.",
        "detected_signals": [],
        "risk_score": 0,
        "proposed_action": "web_search",
        "decision": "ALLOW",
        "explanation": "Test event recorded successfully."
    }
    append_audit_event(test_event)
    print("Test event successfully appended to audit_log.jsonl!")

if __name__ == "__main__":
    test_member4_modules()