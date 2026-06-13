# AGENT INBOX — Guarded SUM Phase B: Sampling Robustness

Date: 2026-06-13
Phase: Guarded SUM Phase B (Execution Safety)
Commander: Gemini Brain
Priority: P0 — Data Integrity Risk

---

## Bối Cảnh

Hiện tại, `guarded-sum-bridge.ts` chỉ lấy đúng 500 dòng đầu (`head`) để quyết định measure có an toàn cho hàm SUM ( DuckDB execution ) hay không.
Điều này gây rủi ro Data Integrity rất lớn (Silent wrong SUM), vì dirty data thường nằm ở những dòng tail (dòng cuối).

Phase B sẽ khắc phục triệt để bằng cách:
1. Scan toàn bộ (full scan) nếu dataset ≤ 2000 rows.
2. Scan 1000 head + 1000 tail nếu dataset > 2000 rows.
3. Update `NumericHealthResult` trả về đầy đủ audit trace.
4. Nới lỏng `isSafeForSum` (ngưỡng 80%) nhưng tăng cường cảnh báo nếu `estimatedDropRate` > 5%.

---

## Scope

Chỉ sửa 2 file:
- `apps/desktop/src/lib/numeric-health-gate.ts` (và file test của nó)
- `apps/desktop/src/lib/guarded-sum-bridge.ts`

KHÔNG ĐƯỢC CHẠM VÀO UI components.

---

## File 1: `apps/desktop/src/lib/numeric-health-gate.ts`

**1. Sửa interface:**
```ts
export interface NumericHealthResult {
  columnName: string;
  isSafeForSum: boolean;
  parseSuccessRate: number;
  needsCleansing: boolean;
  // Phase B fields
  scannedRows: number;
  totalRows: number;
  scanCoverage: number;
  estimatedDropRate: number;
  warningMessage?: string;
}
```

**2. Sửa function signature & logic:**
Sửa `evaluateNumericHealth` nhận thêm `totalRows?: number` (hoặc lấy từ `sampleValues.length` nếu không có).

Bên trong `evaluateNumericHealth`:
- Tính `scannedRows = sampleValues.length`
- Tính `totalRows = totalRows || scannedRows`
- Tính `scanCoverage = scannedRows > 0 ? scannedRows / totalRows : 0`
- Tính `estimatedDropRate = validSampleCount > 0 ? (validSampleCount - successCount) / validSampleCount : 0`
- Đổi điều kiện `isSafeForSum`:
  ```ts
  const isSafeForSum = parseSuccessRate >= 0.80;
  ```
- Tạo warningMessage:
  ```ts
  let warningMessage: string | undefined = undefined;
  if (estimatedDropRate > 0.05) {
    warningMessage = `High drop rate (${(estimatedDropRate * 100).toFixed(1)}%). SUM may exclude dirty rows.`;
  }
  ```

---

## File 2: `apps/desktop/src/lib/guarded-sum-bridge.ts`

**1. Cập nhật `extractSampleValues`:**
Sửa hàm này để lấy mẫu theo quy tắc:
- Nhận thêm `rawRows` đầy đủ.
- Nếu `rawRows.length <= 2000` → lấy toàn bộ rows (full scan).
- Nếu `rawRows.length > 2000` → lấy 1000 rows đầu (head) + 1000 rows cuối (tail).

```ts
function extractSampleValues(measure: string, rawRows: any[]): any[] {
  if (rawRows.length === 0) return [];
  const firstRow = rawRows[0];
  const exactKey = Object.keys(firstRow).find(k => k.toLowerCase() === measure.toLowerCase());
  if (!exactKey) return [];

  const samples = [];
  if (rawRows.length <= 2000) {
    for (let i = 0; i < rawRows.length; i++) {
      samples.push(rawRows[i][exactKey]);
    }
  } else {
    // Head 1000
    for (let i = 0; i < 1000; i++) {
      samples.push(rawRows[i][exactKey]);
    }
    // Tail 1000
    for (let i = rawRows.length - 1000; i < rawRows.length; i++) {
      samples.push(rawRows[i][exactKey]);
    }
  }
  return samples;
}
```

**2. Cập nhật `enhancePlanWithGuardedSum`:**
Khi gọi `evaluateNumericHealth`, truyền thêm `rawRows.length` làm param `totalRows` (vì hàm `extractSampleValues` chỉ trả mảng mẫu, không phải toàn bộ dataset).
```ts
const health = evaluateNumericHealth(measure, samples, rawRows.length);
```

Và cập nhật đoạn sinh warning. Thay vì hardcode công thức ở đây, hãy dùng thẳng `health.estimatedDropRate` và `health.warningMessage`:
```ts
if (health.isSafeForSum) {
  measureAggregations[measure] = "SUM";
  if (health.needsCleansing || health.parseSuccessRate < 1.0) {
    newWarnings.push(`Measure '${measure}' underwent silent cleansing (drop rate: ${(health.estimatedDropRate * 100).toFixed(1)}% or stripped chars) to enable SUM.`);
  }
  if (health.warningMessage) {
    newWarnings.push(`Measure '${measure}': ${health.warningMessage}`);
  }
} else {
  measureAggregations[measure] = "COUNT";
}
```

---

## File 3: `apps/desktop/src/lib/numeric-health-gate.test.ts`

Sửa các tests hiện tại để tương thích với `NumericHealthResult` mới. Bạn có thể pass mock `totalRows` vào các test.

Đảm bảo test cover:
- parseSuccessRate >= 0.80 cho kết quả `isSafeForSum = true`.
- estimatedDropRate > 0.05 tạo ra `warningMessage`.

---

## Verification Commands

Chạy theo thứ tự:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. Test numeric-health-gate
pnpm exec vitest run src/lib/numeric-health-gate.test.ts

# 2. Test guarded sum
pnpm exec vitest run src/lib/guarded-sum-bridge.test.ts

# 3. Test stress test (có dùng evaluateNumericHealth)
pnpm exec vitest run src/lib/stress_test.test.ts

# 4. Full suite
pnpm test

# 5. TypeScript
npx tsc --noEmit
```

---

## Handoff Requirements

Khi xong, viết:
- `AGENT_HANDOFF.md`: Cập nhật trạng thái "Guarded SUM Phase B" thành ✅ Complete. Ghi rõ số lượng test pass.
- `AGENT_OUTBOX.md`: Output test.
- `CHANGELOG.md`: Thêm entry cho "Guarded SUM Phase B" (ở phần Unreleased).
- Git commit: `fix(execution): Guarded SUM Phase B — robust head/tail sampling and 80% safety threshold`
