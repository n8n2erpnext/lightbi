# LightBI Real Data Quality Gate

Created: 2026-06-14  
Purpose: define the minimum evidence required before any LightBI phase can be called complete, production-ready, or successfully verified.

## 1. Why This Exists

LightBI is not a technology demo. It is an app that must read, understand, and analyze real business data.

Passing unit tests is not enough. A beautiful architecture report is not enough. A generated toy dataset is not enough.

The `n8n2erpnext` ecosystem uses a live-tested standard: workflows are verified against real ERPNext/Frappe runtimes, real document lifecycles, negative cases, ledger/readback checks, and security response policies.

LightBI must follow the same spirit:

```text
No real-data evidence = not done.
No screenshot/result JSON/log = not proven.
Unit tests green = minimum hygiene, not acceptance.
```

## 2. Core Rule

A LightBI feature or fix can be called `PASS` only when it has evidence across the correct layer:

```text
Code correctness
-> runtime behavior
-> real data behavior
-> user-visible result
-> evidence artifacts
```

If a phase only proves one layer, the report must say so.

Examples:

- Unit tests pass, but no real file was uploaded: `PARTIAL`.
- Localhost works, but production domain was not tested: `PARTIAL`.
- Raw data is clean but runtime analysis fails: `FAIL runtime compatibility`, not `bad data`.
- Screenshot exists but no query/result ran: `SMOKE ONLY`, not visual regression.

## 3. Language Policy

Agents must not use these words unless the required evidence exists:

- `mỹ mãn`
- `perfect`
- `production ready`
- `fully fixed`
- `diệt tận gốc`
- `100% complete`
- `works end-to-end`

Allowed language:

- `PASS`
- `FAIL`
- `PARTIAL`
- `SMOKE ONLY`
- `NOT TESTED`
- `BLOCKED`

Every report must prefer factual status over optimistic wording.

## 4. Required Evidence Levels

### Level 0: Code Hygiene

Required for every code change:

- relevant unit tests
- typecheck when available and not blocked by known out-of-scope errors
- no unrelated file churn
- exact files changed

This level alone is not product acceptance.

### Level 1: Runtime Contract Verification

Required for planner/executor/runtime changes:

- actual generated runtime intent/plan/SQL inspected in tests
- errors normalized and distinguishable
- no silent fallback for complex analytics
- virtual/system fields are not treated as user raw columns
- local DuckDB path tested when relevant

This level proves the engine contract, not real user success.

### Level 2: Real Sample Data Verification

Required for any claim that LightBI handles business data:

- upload real sample files from the repository
- record row/column counts shown by the app
- record data quality/readiness shown by the app
- run at least one Investigation action
- capture result or exact runtime failure
- save screenshots and machine-readable results

This is the minimum level for product confidence.

### Level 3: Production Domain Verification

Required before claiming deployed behavior:

- test `https://lightbi.thaiduy.digital`
- use Chromium/Playwright on the VPS
- do not use localhost as final acceptance
- report if production is behind local code
- capture console, page, and network errors

This is required for user-facing acceptance.

### Level 4: Multi-file / Workflow Verification

Required for claims about multi-file behavior:

- upload multiple real files together if the UI supports it
- if unsupported, report unsupported honestly
- verify whether app merges, registers separately, rejects, or corrupts state
- run Investigation if available
- capture screenshots and result JSON

This level is required before claiming multi-file support.

## 5. Real Data Acceptance Pack

The current mandatory real sample pack includes:

```text
sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx
sample data/DATA_XUAT.xlsx
sample data/TỒN DỰ KIẾN HUBLAN.xlsx
sample data/bcctnhapTTKT_23122024.xlsx
sample data/bcctnhapTTKT_24122024.xlsx
```

Audit CSV pack:

```text
sample-data-audit/customer/good_customer.csv
sample-data-audit/customer/broken_customer.csv
sample-data-audit/finance/good_finance.csv
sample-data-audit/finance/broken_finance.csv
sample-data-audit/inventory/good_inventory.csv
sample-data-audit/inventory/broken_inventory.csv
sample-data-audit/operations/good_operations.csv
sample-data-audit/operations/broken_operations.csv
sample-data-audit/performance/good_performance.csv
sample-data-audit/performance/broken_performance.csv
sample-data-audit/revenue/good_revenue.csv
sample-data-audit/revenue/broken_revenue.csv
```

These files are not toy data. The Excel files are real Vietnamese logistics exports and must be treated as acceptance data.

## 6. Real Data E2E Requirements

For each real file:

1. Open the target app URL.
2. Upload the file.
3. Wait for ingestion/understanding.
4. Capture Home/intake screenshot.
5. Record visible row count and column count.
6. Record visible quality/readiness/trust status.
7. Record detected domain/signals if visible.
8. Record available actions/opportunities.
9. Select the safest action:
   - prefer `table_preview`
   - otherwise choose first available action
10. Go to Investigation.
11. Click `Run preview`.
12. Capture before/after screenshots.
13. Record exact result:
   - executed
   - failed
   - blocked
   - no action available
14. Capture console/page/network errors.

Output must include:

```text
ui-audit/<phase>/results.json
ui-audit/<phase>/*.png
REAL_SAMPLE_DATA_E2E_AUDIT_<date>.md
AGENT_HANDOFF_REAL_SAMPLE_DATA_E2E_AUDIT_<date>.md
```

## 7. Multi-file E2E Requirements

Required groups:

```text
Group 1: bcctnhapTTKT_23122024.xlsx + bcctnhapTTKT_24122024.xlsx
Group 2: DATA_XUAT.xlsx + TỒN DỰ KIẾN HUBLAN.xlsx
Group 3: all 5 real Excel logistics files
Group 4: all good_*.csv files from sample-data-audit
Group 5: all good_*.csv + broken_*.csv files from sample-data-audit
```

Report:

- accepted or rejected
- merged or registered separately
- state stable or corrupted
- selected dataset behavior
- Investigation behavior
- screenshots
- exact errors

## 8. PASS / FAIL / PARTIAL Definitions

### PASS

All are true:

- file uploads successfully
- row/column counts are plausible
- understanding result appears
- selected action is valid
- Investigation preview executes or table preview works
- no unhandled crash
- no silent complex fallback
- screenshots and JSON exist

### PARTIAL

One or more are true:

- upload works but no useful action exists
- understanding appears but Investigation fails truthfully
- local works but production was not tested
- screenshot exists but no runtime preview was executed
- multi-file upload is unsupported but single-file works

### FAIL

Any are true:

- upload fails
- app crashes
- data row/column counts are missing or clearly wrong
- action generation is empty or invalid
- runtime asks for virtual fields like `record_count` as raw data
- empty `group_by` reaches execution
- unhandled DuckDB/projection error appears
- complex intent silently falls back to JS sandbox
- report lacks evidence

## 9. Runtime Truth Error Watchlist

Every E2E audit must scan logs/DOM/errors for:

```text
CANONICAL_PROJECTION_MISSING
CANONICAL_PROJECTION_CONFLICT
DUCKDB_BINDER_ERROR
DUCKDB_CATALOG_ERROR
DUCKDB_PARSER_ERROR
DUCKDB_UNKNOWN_RUNTIME_ERROR
record_count
row_count
group_by requires at least
empty group_by
table_preview missing
NETWORK_UNAVAILABLE
LOCAL_EXECUTOR_UNAVAILABLE
DUCKDB_BOOTSTRAP_ERROR
```

## 10. Data Quality vs Runtime Compatibility

Do not confuse these two.

Raw data quality answers:

```text
Is the file internally clean, complete, consistent, and parseable?
```

Runtime compatibility answers:

```text
Can LightBI map, plan, and execute an analysis against it?
```

If raw data quality is 100% but runtime fails, report:

```text
Raw data quality: PASS
Runtime compatibility: FAIL
```

Do not lower raw data quality to hide runtime failure.

## 11. Production Domain Rule

If the user asks whether the app works, final evidence must target:

```text
https://lightbi.thaiduy.digital
```

Localhost is allowed for debugging, but not final acceptance.

If production is behind local code, report:

```text
Production deployment is behind local workspace.
```

This is a finding, not an excuse.

## 12. Report Template

Every real-data audit report must include:

```markdown
# <Phase Name>

## Environment
- URL:
- Browser:
- Command:
- Timestamp:
- Git status:
- Latest commit:

## File Inventory
| File | Size | Type | Sheets | Expected Rows (if known) |

## Single-file Results
| File | Status | Upload | Rows | Columns | Understanding | Selected Action | Preview Run | Error |

## Multi-file Results
| Group | Status | Behavior | Preview Run | Error |

## Runtime Truth Findings
| Finding | File/Group | Evidence |

## Screenshots
| File/Group | Home | Before | After |

## JSON Evidence
- Path:

## Product Assessment
- Can LightBI handle the real logistics sample pack today?
- What works?
- What fails?
- What is the smallest next corrective phase?

## Production Readiness Verdict
PASS / PARTIAL / FAIL
```

## 13. Agent Instructions

Before claiming completion, agents must answer:

- Did I use real files?
- Did I run on the requested domain?
- Did I capture screenshots?
- Did I save `results.json`?
- Did I record console/page/network errors?
- Did I test single-file and multi-file?
- Did I avoid changing code during audit?
- Did I report failures plainly?

If any answer is no, the phase is not complete.

