# AGENT INBOX — Phase 5: Lightweight Advanced Handoff Artifact

Date: 2026-06-13
Phase: MVP Phase 5 (Advanced Mode Handoff)
Commander: Gemini Brain
Priority: P1

---

## Bối Cảnh

Theo ROADMAP-MVP-V1.md, chúng ta đã hoàn tất Phase 0, 1, 2, 3 và 4. Giờ là Phase 5: tạo một Artifact (file JSON) chứa toàn bộ Semantic Understanding, Readiness, Caveats,... để bàn giao cho các Data Analysts dùng trong Advanced Mode (Python/dbt). Mục đích là để họ thừa hưởng được bộ engine "Understanding" của LightBI mà không cần LightBI phải biến thành 1 công cụ ETL cồng kềnh.

---

## Scope

Tạo ra tính năng xuất file JSON "Advanced Handoff" từ DatasetUnderstanding.
Chỉ sửa / tạo các file sau:
- `apps/desktop/src/lib/advanced-handoff-contract.ts` (Tạo mới)
- `apps/desktop/src/lib/advanced-handoff-generator.ts` (Tạo mới)
- `apps/desktop/src/lib/advanced-handoff-generator.test.ts` (Tạo mới)
- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx` (Sửa để thêm nút Export)

---

## Yêu Cầu Code

### 1. `apps/desktop/src/lib/advanced-handoff-contract.ts`
Tạo interface cho Artifact. Yêu cầu có:
```ts
import type { DatasetGrain } from './dataset-understanding-contract';

export interface FieldMapping {
  physicalColumn: string;
  canonicalSignal?: string;
  domain?: string;
  role: "dimension" | "measure" | "time" | "unknown";
  confidence: number;
}

export interface AdvancedHandoffArtifact {
  datasetId: string;
  datasetName?: string;
  generatedAt: string;
  grain: DatasetGrain;
  grainEvidence: string;
  readinessTier: string;
  readinessScore: number;
  fieldMappings: FieldMapping[];
  caveats: string[];
}
```

### 2. `apps/desktop/src/lib/advanced-handoff-generator.ts`
Hàm pure function để map từ `DatasetUnderstanding` và raw columns sang `AdvancedHandoffArtifact`:
```ts
import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AdvancedHandoffArtifact, FieldMapping } from './advanced-handoff-contract';
import { getSignalType } from './business-signal-detector';

export function generateAdvancedHandoff(
  understanding: DatasetUnderstanding,
  rawColumns: string[]
): AdvancedHandoffArtifact {
  // Logic: 
  // 1. Duyệt qua rawColumns
  // 2. Với mỗi column, tìm trong understanding.mappingReview hoặc understanding.detectedConcepts
  //    để lấy canonicalSignal, domain, confidence.
  // 3. getSignalType(canonicalSignal) để ra role.
  // 4. Trả về object AdvancedHandoffArtifact
}
```

### 3. `apps/desktop/src/lib/advanced-handoff-generator.test.ts`
Viết test case đảm bảo hàm sinh JSON artifact chạy đúng, có test trường hợp dataset tốt, và trường hợp không nhận diện được column nào.

### 4. `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
Thêm một button **"Export Advanced Handoff"** (nằm cạnh nút View Data hoặc ở góc card).
Khi click:
- Gọi `generateAdvancedHandoff` (chú ý bạn cần lấy được `rawColumns` từ đâu đó trong Component, có thể lấy từ context hoặc props, hoặc lấy từ keys của data mẫu).
- Serialize ra JSON chuỗi.
- Tạo một blob download: `lightbi_handoff_${datasetId}.json`.

---

## Verification Commands

Chạy theo thứ tự:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. Test unit
pnpm exec vitest run src/lib/advanced-handoff-generator.test.ts

# 2. Build TypeScript check
npx tsc --noEmit

# 3. Test regression toàn cục
pnpm test
```

---

## Handoff Requirements

Khi xong, viết:
- `AGENT_HANDOFF_PHASE5.md`: Cập nhật trạng thái Phase 5 ✅ Complete.
- `AGENT_OUTBOX.md`: Output test.
- Git commit: `feat(understanding): Phase 5 — Lightweight Advanced Handoff JSON export`
