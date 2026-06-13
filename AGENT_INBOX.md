# AGENT INBOX — DU-9 Phase 2: Semantic Graph Visual Polish + Playwright Capture

Date: 2026-06-13
Phase: DU-9 Phase 2 — Visual Fixes + Tooltip + Playwright Capture
Commander: Gemini Brain
Priority: P1 — Beta Demo Quality
Prerequisite: DU-9 Phase 1 (commit d763b6b) ✅ DONE

---

## Bối Cảnh

Phase 1 đã tạo xong graph structure và đúng logic. Tuy nhiên Brain QA phát hiện 3 lỗi visual cần fix trước Beta:

1. **Node border sai màu**: `stroke="#333"` (đen) thay vì `stroke="#fff"` (trắng) — node trông nặng nề, không premium
2. **Tất cả edges cùng màu #999**: Không phân biệt được relationship vs workflow vs co_occurrence
3. **Thiếu `performance` domain màu**: `DOMAIN_COLORS` không có `performance` → node performance domain dùng màu `unknown` (#888)

Phase 2 fix 3 lỗi này + thêm hover tooltip + Playwright visual capture.

---

## Scope

Chỉ được sửa:
- `apps/desktop/src/components/analysis/SemanticGraphView.tsx`
- `apps/desktop/src/components/analysis/SemanticGraphView.test.tsx` (cập nhật test)
- Thêm Playwright spec mới nếu cần

KHÔNG được sửa:
- `semantic-graph-model.ts`
- `semantic-graph-builder.ts`
- `semantic-graph-builder.test.ts`
- `DatasetUnderstandingCard.tsx`
- Bất kỳ file lib / server / executor nào

---

## Fix 1: Node border — `stroke="#333"` → `stroke="#fff"`

Trong `SemanticGraphView.tsx`, tìm dòng có `stroke="#333"` ở `<circle>` → đổi thành `stroke="#fff"`.

---

## Fix 2: Edge colors theo type

Thay đổi phần render edges. Hiện tại tất cả edges dùng `stroke="#999"`. Cần phân biệt:

```
relationship → stroke="#818cf8" (indigo), strokeWidth=2, strokeOpacity=0.6
workflow     → stroke="#34d399" (emerald), strokeWidth=1.5, strokeDasharray="5,3", strokeOpacity=0.7
co_occurrence → stroke="#94a3b8" (slate), strokeWidth=1, strokeOpacity=0.4
```

Thay phần render edge hiện tại bằng:
```tsx
const getEdgeStyle = (type: string) => {
  if (type === 'relationship') return { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: 'none', strokeOpacity: 0.6 };
  if (type === 'workflow')     return { stroke: '#34d399', strokeWidth: 1.5, strokeDasharray: '5,3', strokeOpacity: 0.7 };
  return { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: 'none', strokeOpacity: 0.4 }; // co_occurrence
};
```

Áp dụng `getEdgeStyle(edge.type)` vào từng `<line>` thay vì hardcode.

---

## Fix 3: Thêm `performance` vào DOMAIN_COLORS

```ts
const DOMAIN_COLORS: Record<string, string> = {
  operations:  '#4F86C6',
  finance:     '#5EAA7B',
  inventory:   '#E08A3C',
  revenue:     '#9B6BC9',
  customer:    '#E05C7A',
  performance: '#F59E0B',   // ← THÊM DÒNG NÀY
  unknown:     '#888888'
};
```

---

## Fix 4: Hover tooltip bằng SVG `<title>`

Bên trong `<g key={node.id}>`, thêm `<title>` ngay sau `<g>`:

```tsx
<g key={node.id}>
  <title>{`${node.label} (${node.domain}) · ${Math.round(node.confidenceScore)}% confidence`}</title>
  <circle ... />
  <text ... />
</g>
```

SVG `<title>` là native browser tooltip — không cần JS, không cần thư viện.

---

## Cập Nhật Tests: `SemanticGraphView.test.tsx`

Thêm 2 test case mới:

**Test 4: Node border là white**
```tsx
it('renders circle with white stroke border', () => {
  const graph = {
    nodes: [{ id: 'route', label: 'Route', type: 'dimension' as const, domain: 'operations', confidenceScore: 80 }],
    edges: [],
    grain: 'event'
  };
  const { container } = render(<SemanticGraphView graph={graph} />);
  const circle = container.querySelector('circle');
  expect(circle?.getAttribute('stroke')).toBe('#fff');
});
```

**Test 5: Performance domain dùng màu #F59E0B**
```tsx
it('renders performance domain node with amber color', () => {
  const graph = {
    nodes: [{ id: 'kpi', label: 'KPI', type: 'dimension' as const, domain: 'performance', confidenceScore: 90 }],
    edges: [],
    grain: 'unknown'
  };
  const { container } = render(<SemanticGraphView graph={graph} />);
  const circle = container.querySelector('circle');
  expect(circle?.getAttribute('fill')).toBe('#F59E0B');
});
```

3 tests cũ phải vẫn pass. Tổng: 5 tests trong SemanticGraphView.test.tsx.

---

## Playwright Visual Capture

Tạo file mới: `apps/desktop/e2e/semantic-graph-capture.spec.ts`

Playwright spec này chụp ảnh Concept Map cho 2 dataset:

```ts
import { test, expect } from '@playwright/test';

test('Delivery dataset shows Concept Map with event grain', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Upload good_operations.csv từ sample-data-audit/
  // Chờ DatasetUnderstandingCard hiển thị
  // Tìm element có text "Concept Map"
  // Chụp screenshot SVG graph
  await page.screenshot({ path: 'e2e/screenshots/delivery-concept-map.png', fullPage: false });
  // Verify text "event" xuất hiện trong SVG (grain badge)
  await expect(page.locator('text=event')).toBeVisible();
});

test('Inventory dataset shows Concept Map with snapshot grain', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Upload good_inventory.csv từ sample-data-audit/
  // Chờ DatasetUnderstandingCard hiển thị
  // Chụp screenshot
  await page.screenshot({ path: 'e2e/screenshots/inventory-concept-map.png', fullPage: false });
  // Verify grain badge
  await expect(page.locator('svg')).toBeVisible();
});
```

**Lưu ý quan trọng:** Nếu e2e test cần server đang chạy và không thể chạy headless trong môi trường này, CHỈ tạo file spec nhưng KHÔNG chạy Playwright. Ghi rõ trong handoff: "Playwright spec created, requires manual run with dev server".

---

## Verification Commands

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. SemanticGraphView tests (phải pass 5 tests)
pnpm exec vitest run src/components/analysis/SemanticGraphView.test.tsx

# 2. Full suite — 0 regression
pnpm test

# 3. TypeScript
npx tsc --noEmit
```

---

## Handoff Requirements

Khi xong, viết:
- `AGENT_HANDOFF_SEMANTIC_GRAPH_PHASE2.md`:
  - 3 lỗi visual đã fix (liệt kê rõ từng fix)
  - Test count: bao nhiêu test trước, bao nhiêu sau
  - TypeScript result
  - Playwright spec: đã tạo hay không, có chạy được không

- `AGENT_OUTBOX.md`: test output + kết quả

- `CHANGELOG.md`: thêm DU-9 Phase 2 entry

- Git commit: `fix(du9): visual polish — white node border, typed edge colors, performance domain, hover tooltip`
