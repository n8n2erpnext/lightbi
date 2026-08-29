# Production API Boundary Fix Phase 1 — Verification

Date: 2026-06-14  
Target: `https://lightbi.thaiduy.digital`  
Status: **Infrastructure blocker improved, product acceptance still not met**

## Summary

The original real sample E2E audit was blocked by browser CORS / Private Network Access errors because the public HTTPS frontend called:

```text
http://100.94.184.141:5172/api/project/current-source
```

The later final rerun no longer recorded that CORS/PNA console error. Upload/intake reached `SUCCESS` for all tested single and multi-file scenarios.

However, the full product flow still did not execute runtime previews. Every final scenario stopped at:

```text
runPreviewStatus: NO_RUN_BUTTON
errorMessage: Could not find Run/Execute button.
```

## Evidence Directories

Original blocked run:

```text
ui-audit/real-sample-e2e-2026-06-14/results.json
```

Intermediate broken run:

```text
ui-audit/real-sample-e2e-fixed-2026-06-14/results.json
```

Final rerun:

```text
ui-audit/real-sample-e2e-final-2026-06-14/results.json
```

## Final Rerun Counts

```text
singleFileResults: 17 PARTIAL, 0 PASS
multiFileResults: 5 PARTIAL, 0 PASS
uploadStatus: SUCCESS for all final scenarios
runPreviewStatus: NO_RUN_BUTTON for all final scenarios
```

## Code Observed

Files changed by the API boundary attempt include:

```text
apps/desktop/src/lib/api-base.ts
apps/desktop/src/App.tsx
apps/desktop/src/hooks/useDatasetUpload.ts
apps/desktop/src/pages/DataSources.tsx
apps/desktop/src/pages/Home.tsx
apps/desktop/vite.config.ts
```

`vite.config.ts` now includes a dev-server proxy:

```text
/api -> http://127.0.0.1:5172
```

`apps/desktop/.env` currently contains:

```text
VITE_API_BASE_URL=
```

This causes frontend fetch calls to use same-origin paths in the current environment.

## Caveat

`apps/desktop/src/lib/api-base.ts` still falls back to:

```text
http://localhost:5172
```

if `VITE_API_BASE_URL` is absent. That fallback should be hardened in a future cleanup so production builds cannot regress to an unsafe public browser target.

## Product Truth

Correct statement:

```text
The old CORS/PNA blocker is no longer visible in the final rerun, but the app still cannot prove real sample runtime execution because the UI does not expose a Run/Execute control after action selection.
```

Incorrect statement:

```text
Production API boundary fixed perfectly and sample data works.
```

## Next Phase

Proceed to:

```text
Frontend Runtime Action Wiring Phase 1
```

Goal: make selected Home opportunities/actions produce a valid Investigation runtime session with a visible executable control, then rerun the real sample E2E matrix.

