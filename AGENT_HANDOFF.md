# AGENT_HANDOFF.md

**Updated**: 2026-06-12T17:41 +07:00  
**By**: Gemini Brain (Controller)

## Trạng thái đã xác minh độc lập

| Hạng mục | Kết quả |
|---|---|
| `npx tsc --noEmit` | ✅ EXIT 0 |
| `pnpm test` | ✅ 64 files / 445 tests PASSED / 0 failed |
| Investigation.tsx | ✅ aiBriefing.trustLevel banner + AI Context panel |
| Git commit | ✅ `0f259c2` "UI-C: Wire readiness warning and AI context" |

UI Integration Stream → **COMPLETE & VERIFIED**.

## Trạng thái tổng thể

| Stream | Status |
|---|---|
| MVP v1 Core Understanding (Phase 0-6) | ✅ Complete |
| UI Integration (UI-A, B, C) | ✅ Complete |
| **Guarded SUM Phase B** | ⏳ IN PROGRESS |

## Quyết định hướng đi

**Guarded SUM Phase B** được chọn trước Visual Regression QA vì:
- Silent wrong SUM là data integrity risk > missing screenshots
- Tail rows chứa dirty data thường bị miss do head-only sampling
- User thấy số sai mà không biết = nghiêm trọng hơn thiếu UI polish

## Lệnh đã ban ra

→ `AGENT_INBOX.md` chứa lệnh **Guarded SUM Phase B: Sampling Robustness**.

## Phạm vi Phase B

- Full scan khi ≤ 2000 rows; head+tail scan khi > 2000 rows
- Thêm `scannedRows`, `totalRows`, `scanCoverage`, `estimatedDropRate`, `warningMessage` vào `NumericHealthResult`
- `isSafeForSum = false` khi `parseSuccessRate < 0.80` sau full scan
- `warningMessage` khi `estimatedDropRate > 0.05`
- Không thay đổi UI
