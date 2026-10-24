# AGENTSHIELD

**AGENTSHIELD** is a hackathon prototype for detecting prompt injection and agent manipulation in AI workflows. It shows the agent’s proposed action, the monitor’s findings, and the policy decision before any simulated tool action runs.

## How it works

```text
User task + source content
          ↓
Agent proposes an action
          ↓
Security monitor assesses task, content, and proposed action
          ↓
Policy gate decides: allow, quarantine, or block
          ↓
Allowed action runs in the simulator
          ↓
Events appear in the timeline and are written to the audit log
```

- **Allow:** the simulated action may proceed.
- **Quarantine:** the run pauses until the user resumes or aborts.
- **Block:** the action does not run.
- Gemini generates proposals only. The backend monitor and policy gate control whether an action proceeds.
- Tools are simulated; the prototype does not send real messages or make real external requests.

## Stack

- Frontend: React and Vite
- Backend: Python and FastAPI
- Validation: Pydantic
- Agent providers: scripted demo and Gemini API
- Audit: JSON Lines (`backend/audit_log.jsonl`)

## Requirements

- Python 3.10+
- Node.js and npm
- A Gemini API key to use Live Gemini mode

## Backend setup

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` for Live Gemini mode:

```env
LLM_API_KEY=your-gemini-api-key
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=your-enabled-gemini-model-id
```

Keep `.env` private. Do not commit it or expose the key in frontend code. The backend loads it with `python-dotenv`.

Start the backend from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The API docs are available at:

```text
http://127.0.0.1:8000/docs
```

## Frontend setup

In a second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

Use the frontend’s provider selector to choose **Scripted Demo** or **Live Gemini**. Gemini credentials remain on the backend.

## Running a scenario

In the frontend:

1. Enter a task.
2. Choose a demo scenario, if the UI offers one:
   - `safe`
   - `indirect_injection`
   - `multi_turn_injection`
3. Choose Scripted Demo or Live Gemini.
4. Start the run and follow the event timeline.
5. If the run is quarantined, choose Resume or Abort.

The backend API includes:

- `POST /api/runs` — start a run
- `GET /api/runs/{run_id}/events` — stream run events using Server-Sent Events
- `POST /api/runs/{run_id}/decision` — resume or abort a quarantined run

Example decision request:

```json
{"decision":"resume"}
```

or:

```json
{"decision":"abort"}
```

Only submit a decision when the run is actually waiting in quarantine.

## Tests

From the `backend/` directory, with the virtual environment active:

```bash
python -m unittest discover -s tests -v
```

## Security notes and current limits

- The monitor uses configured detection patterns and deterministic scoring. It is a prototype and can miss attacks or flag benign text.
- Treat retrieved or supplied source content as untrusted and keep its provenance visible.
- The policy gate must remain between every proposed action and tool execution.
- Canary checks are enforced before simulated outbound actions.
- Tool execution is simulated. Do not connect real outbound tools without adding appropriate authorization, validation, and safeguards.
- Never put API keys in frontend code, source control, screenshots, or shared logs.
