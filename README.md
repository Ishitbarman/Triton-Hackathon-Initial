## File Ownership

### Member 1 — Frontend (React + Vite)
- frontend/package.json
- frontend/index.html
- frontend/vite.config.ts
- frontend/src/main.tsx
- frontend/src/App.tsx
- frontend/src/features/dashboard/Dashboard.tsx
- frontend/src/components/RunControls.tsx
- frontend/src/components/EventTimeline.tsx
- frontend/src/components/EventCard.tsx
- frontend/src/api/client.ts
- frontend/src/types/events.ts

### Member 2 — Threat Monitor
- backend/app/monitor/detector.py
- backend/app/monitor/scorer.py
- backend/app/schemas/monitor.py

### Member 3 — Backend + Agent
- backend/requirements.txt
- backend/app/main.py
- backend/app/api/routes.py
- backend/app/orchestration/runner.py
- backend/app/agent/provider.py
- backend/app/schemas/events.py
- backend/app/schemas/actions.py
- backend/app/policy/gate.py

### Member 4 — Simulated Tools, Scenarios, and Audit
- backend/app/tools/mock_tools.py
- backend/app/audit/jsonl_store.py
- backend/scenarios/safe.json
- backend/scenarios/indirect_injection.json
- backend/scenarios/multi_turn_injection.json

### Shared files
- README.md — project overview, setup, ownership, and run instructions
- .env.example — placeholder configuration only
- .gitignore — shared exclusions for secrets, dependencies, builds, and generated logs

Coordinate before renaming or changing shared schema files. The agent must propose actions; the backend policy gate checks each action before a simulated tool executes.