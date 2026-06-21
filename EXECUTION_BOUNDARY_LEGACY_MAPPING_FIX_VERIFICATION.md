# Execution Boundary & Legacy Mapping Fix Verification

## Audit Summary
- **Unit tests**: PASS.
  - Command: `npm run --silent test -- src/lib/result-validator-contract.test.ts src/lib/analysis-opportunity-actions.test.ts`
  - Result: 2 files passed, 15 tests passed.
- **good_customer.csv**: PASS only because screenshot shows table and no error.
- **Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx**: PASS only because screenshot shows table and no error.
- **Multi-file Group 1**: BLOCKED / NOT VERIFIED because Playwright timed out before finding the file input.
- **Multi-file Group 2**: BLOCKED because "Use selected dataset" button remained disabled and click timed out.

## Fix Details
- `apps/desktop/src/lib/analysis-opportunity-actions.ts` patched to properly downgrade legacy relationship actions to `table_preview` unless they possess at least 2 measures.
- `apps/desktop/src/lib/result-validator-contract.ts` patched to use `outputType: "table"` instead of `"chart"` when the `expectedShape` is `"table"`.
- Added unit tests for both above cases.
- Modified `apps/desktop/e2e/audit_fix.spec.ts` to throw error on explicit failure banners (Execution Boundary Failed, DUCKDB, CANONICAL, SQL preview is empty or blocked).
