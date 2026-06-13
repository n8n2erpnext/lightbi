# AGENT INBOX — DU-9: Semantic Graph Visualization (Phase 1)

Date: 2026-06-13
Phase: DU-9 Phase 1 — Semantic Graph Data Layer + Visual Component
Commander: Gemini Brain
Priority: P1 — Beta Differentiator
Prerequisite: Domain-Aware Understanding fix (commit a2b9875) ✅ DONE

---

## Context

LightBI hiện tại hiển thị understanding dưới dạng text list. Beta user cần nhìn thấy ngay "LightBI đã hiểu data của bạn" qua một visual graph — đây là điểm khác biệt so với JiveDB và mọi BI tool thông thường.

`DatasetUnderstanding` đã có sẵn:
- `detectedConcepts[]` — business signals đã nhận diện
- `relationshipHints[]` — quan hệ giữa signals
- `workflowHints[]` — luồng workflow
- `availableAnalysis[]` — các analysis opportunities (chứa co-occurrence giữa signals)
- `grain` — event/snapshot/entity/summary/unknown

Nhiệm vụ: render tất cả thành một SVG graph hiển thị trực tiếp trong `DatasetUnderstandingCard`.

---

## Architecture Lock

KHÔNG được chạm vào:
- `apps/server/src/main.rs`
- `apps/desktop/src/lib/business-signal-detector.ts`
- `apps/desktop/src/lib/dataset-understanding-contract.ts`
- `apps/desktop/src/lib/dataset-capability-engine.ts`
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- Bất kỳ file DuckDB / executor / runtime nào

KHÔNG được thêm npm package mới. Dùng React + SVG thuần.

---

## File 1 — NEW: `apps/desktop/src/lib/semantic-graph-model.ts`

```ts
export type SemanticNodeType = "dimension" | "measure" | "time" | "unknown";

export type SemanticEdgeType = "co_occurrence" | "workflow" | "relationship";

export interface SemanticNode {
  id: string;
  label: string;
  type: SemanticNodeType;
  domain: string;
  confidenceScore: number;
}

export interface SemanticEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: SemanticEdgeType;
  label?: string;
}

export interface SemanticGraph {
  nodes: SemanticNode[];
  edges: SemanticEdge[];
  grain: string;
}
```

---

## File 2 — NEW: `apps/desktop/src/lib/semantic-graph-builder.ts`

Import từ:
- `DatasetUnderstanding` từ `./dataset-understanding-contract`
- `getSignalType`, `TAXONOMY` từ `./business-signal-detector`
- Types từ `./semantic-graph-model`

Export một function duy nhất:

```ts
export function buildSemanticGraph(understanding: DatasetUnderstanding): SemanticGraph
```

Logic xây dựng nodes:
- Mỗi item trong `understanding.detectedConcepts` → 1 `SemanticNode`
- `id` = `concept.signalId`
- `label` = `concept.label`
- `type` = dùng `getSignalType(concept.signalId)` → map: `"time"→"time"`, `"dimension"→"dimension"`, `"measure"→"measure"`, default `"unknown"`
- `domain` = tra `TAXONOMY[concept.signalId]?.domain ?? "unknown"`
- `confidenceScore` = `concept.confidenceScore`

Logic xây dựng edges (tạo Set để dedup):
- Từ `understanding.relationshipHints[]`: mỗi hint → edge `{sourceId: hint.sourceSignal, targetId: hint.targetSignal, type: "relationship"}`
- Từ `understanding.workflowHints[]`: mỗi hint có `toSignal` → edge `{sourceId: hint.fromSignal, targetId: hint.toSignal, type: "workflow"}`
- Từ `understanding.availableAnalysis[]`: mỗi item có cả `dimensions[0]` và `measures[0]` → edge `{sourceId: dimensions[0], targetId: measures[0], type: "co_occurrence"}`
- Dedup: dùng key `${sourceId}__${targetId}` trong Set. Nếu key đã tồn tại → bỏ qua.
- Filter self-loop: bỏ edge nếu `sourceId === targetId`
- Filter invalid: bỏ edge nếu `sourceId` hoặc `targetId` không có trong danh sách node IDs

Edge `id` = `${type}_${sourceId}_${targetId}`

Return: `{ nodes, edges, grain: understanding.grain }`

---

## File 3 — NEW: `apps/desktop/src/lib/semantic-graph-builder.test.ts`

Test 1: Delivery dataset
```
signals: report_date, route, driver, shipment, satisfaction
→ nodes.length === 5
→ node id="route" có type === "dimension"
→ node id="report_date" có type === "time"
→ node id="shipment" có type === "measure"
→ edges.length >= 1 (từ co_occurrence của availableAnalysis)
→ grain === "event"
```

Test 2: Inventory dataset
```
signals: sku, warehouse, stock_age, stock_qty
→ nodes.length === 4
→ node id="stock_age" có type === "measure"
→ grain === "snapshot"
```

Test 3: Empty understanding
```
signals: []
→ nodes.length === 0
→ edges.length === 0
```

Test 4: No duplicate edges
```
Nếu 2 availableAnalysis items cùng link route → shipment
→ graph chỉ có đúng 1 edge giữa route và shipment
```

---

## File 4 — NEW: `apps/desktop/src/components/analysis/SemanticGraphView.tsx`

Props:
```ts
interface SemanticGraphViewProps {
  graph: SemanticGraph;
}
```

Nếu `graph.nodes.length === 0` → return `null`.

Render `<svg viewBox="0 0 600 240" width="100%" style={{height: '240px'}}>`

Layout nodes (static, không animation):
- Chia đều nodes theo trục X trong viewBox 600px
- Nếu ≤ 6 nodes: 1 hàng ngang, y = 120
- Nếu > 6 nodes: 2 hàng, hàng trên y=80, hàng dưới y=170
- x bắt đầu từ 60, khoảng cách đều

Render edges trước nodes (để nodes đè lên trên):
- `<line x1 y1 x2 y2 stroke="#ccc" strokeWidth="1.5" strokeOpacity="0.5" />`
- Edge type="relationship" → stroke="#818cf8" (indigo)
- Edge type="workflow" → stroke="#34d399" (emerald), strokeDasharray="4"
- Edge type="co_occurrence" → stroke="#94a3b8" (slate)

Render nodes:
- `<circle r="20" />` fill theo domain:
  ```
  operations → #4F86C6
  finance    → #5EAA7B
  inventory  → #E08A3C
  revenue    → #9B6BC9
  customer   → #E05C7A
  performance → #F59E0B
  unknown    → #94a3b8
  ```
- strokeWidth theo type:
  - measure → 3
  - dimension → 2
  - time → 2, strokeDasharray="4"
  - unknown → 1
- stroke color: "#fff" (white border)

Render labels:
- `<text y={nodeY + 34} textAnchor="middle" fontSize="10" fill="#374151">`
- Truncate label nếu > 10 chars: `label.length > 10 ? label.slice(0, 9) + '…' : label`

Grain badge ở góc trên phải SVG:
```tsx
<text x="590" y="18" textAnchor="end" fontSize="10" fill="#6b7280">
  {graph.grain}
</text>
```

---

## File 5 — NEW: `apps/desktop/src/components/analysis/SemanticGraphView.test.tsx`

Test 1: Empty graph → renders null (component returns null, không có SVG)

Test 2: Graph với 3 nodes → render đúng 3 `<circle>`

Test 3: Node domain="operations" → fill="#4F86C6"

Dùng `@testing-library/react` để render và query. Import từ `vitest`.

---

## File 6 — MODIFY: `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`

Thêm import ở đầu file:
```ts
import { buildSemanticGraph } from '../../lib/semantic-graph-builder';
import { SemanticGraphView } from './SemanticGraphView';
```

Trong component body, sau dòng `const analysisActions = ...`:
```ts
const graph = React.useMemo(() => buildSemanticGraph(understanding), [understanding]);
```

Thêm section vào JSX, SAU phần `{/* Header */}` và TRƯỚC phần `{/* Readiness Banner */}` (khoảng sau line 88 hiện tại):

```tsx
{/* Semantic Concept Map */}
{graph.nodes.length >= 2 && (
  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
      Concept Map
    </p>
    <SemanticGraphView graph={graph} />
  </div>
)}
```

KHÔNG bọc trong `<details>`. Graph phải hiển thị ngay, không cần click.

---

## Verification Commands

Chạy theo thứ tự. Chỉ báo xong khi TẤT CẢ pass:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. Test graph builder
pnpm exec vitest run src/lib/semantic-graph-builder.test.ts

# 2. Test graph component
pnpm exec vitest run src/components/analysis/SemanticGraphView.test.tsx

# 3. Full suite — 0 regression
pnpm test

# 4. TypeScript
npx tsc --noEmit
```

---

## Cleanup

Xóa các file debug/scratch đã tạo trong quá trình làm:
- `/home/ubuntu/n8n2erpnext/LightBI/patch_contract*.mjs`
- `/home/ubuntu/n8n2erpnext/LightBI/generate_domain_opps.ts`
- `/home/ubuntu/n8n2erpnext/LightBI/investigate_test*.ts`
- `/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/debug-test.ts`
- `/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/check_types.ts`
- `/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/investigate_test*.ts`

---

## Handoff Requirements

Khi xong, viết:
- `AGENT_HANDOFF_SEMANTIC_GRAPH_PHASE1.md`:
  - Files đã tạo/sửa
  - Test count mới (trước/sau)
  - TypeScript kết quả
  - Có cleanup scratch files chưa

- `AGENT_OUTBOX.md`: kết quả test rõ ràng

- `CHANGELOG.md`: thêm entry DU-9 Phase 1

- Git commit: `feat(du9): semantic graph data layer and concept map visualization`
