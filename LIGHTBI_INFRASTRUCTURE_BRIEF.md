# LightBI Infrastructure Brief — Stop Guessing The Runtime

Date: 2026-06-14  
Purpose: prevent future agents from blindly probing random process managers before reading the repo contract and existing evidence.

## Current Repo-Level Architecture

Frontend package:

```text
apps/desktop
```

Frontend dev command:

```text
npm/pnpm run dev
vite --host
```

Backend package:

```text
apps/server
```

Backend server:

```text
Axum / Rust
binds 0.0.0.0:5172
routes /api/*
```

Important backend routes:

```text
/api/health
/api/project/current-source
/api/project/import-csv
/api/chart/:id
/api/export/:id/download
/api/question/ask
/api/preview/execute
```

## Current Frontend Proxy Contract

`apps/desktop/vite.config.ts` currently contains:

```text
server.allowedHosts = ['lightbi.thaiduy.digital']
server.proxy['/api'].target = 'http://127.0.0.1:5172'
```

This means the expected browser production/dev-server shape is:

```text
https://lightbi.thaiduy.digital/api/... -> Vite/proxy -> http://127.0.0.1:5172/api/...
```

Do not make the browser call:

```text
http://100.94.184.141:5172
http://localhost:5172
```

from the public HTTPS origin.

## Current API Base State

`apps/desktop/.env` currently contains:

```text
VITE_API_BASE_URL=
```

In the current frontend code this causes requests to be built as same-origin paths, for example:

```text
/api/project/current-source
```

Known caveat:

```text
apps/desktop/src/lib/api-base.ts
```

still falls back to:

```text
http://localhost:5172
```

if `VITE_API_BASE_URL` is absent. This fallback should be hardened later so production cannot regress, but it is not the blocker recorded by the latest real-sample E2E final run.

## What Not To Do First

Do not begin by randomly checking every possible process manager:

```text
pm2
caddy
nginx
cloudflared
docker
```

unless a repo file, service file, or failing command points there.

The repo currently provides no checked-in deployment config for Nginx/Caddy/Cloudflare. The observable app path is Vite dev server plus Axum backend.

## Current Product Blocker

The previous blocker:

```text
CORS / Private Network Access caused by browser call to http://100.94.184.141:5172
```

is no longer visible in:

```text
ui-audit/real-sample-e2e-final-2026-06-14/results.json
```

The current blocker is:

```text
runPreviewStatus: NO_RUN_BUTTON
errorMessage: Could not find Run/Execute button.
```

So the next phase is not “find Caddy” or “prove DuckDB backend” by process guessing. The next phase is:

```text
Frontend Runtime Action Wiring Phase 1
```

Trace:

```text
Home selected action
-> AnalysisAction
-> createRuntimeIntentFromAnalysisAction
-> createRuntimePlanPreview
-> createInvestigationSession
-> Investigation.tsx
-> visible Run/Execute control
```

## Commands That Are Actually Useful

Use these before changing code:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI
git status --short
git log --oneline -5
rg "100\\.94\\.184\\.141:5172|http://localhost:5172|VITE_API_BASE_URL|getApiBaseUrl" apps/desktop/src apps/server -S
```

Check current evidence:

```bash
python3 - <<'PY'
import json, pathlib, collections
p=pathlib.Path('ui-audit/real-sample-e2e-final-2026-06-14/results.json')
data=json.loads(p.read_text())
for key in ['singleFileResults','multiFileResults']:
    arr=data.get(key, [])
    print(key, len(arr), collections.Counter(r.get('status') for r in arr), collections.Counter(r.get('runPreviewStatus') for r in arr))
PY
```

Only use broad process discovery after the repo/evidence path says the running service itself is missing.

