# AGENT INBOX — Phase 6: AI Semantic Briefing Contract

Date: 2026-06-13
Phase: MVP Phase 6 (AI Briefing)
Commander: Gemini Brain
Priority: P1 — MVP V1 Final Phase

---

## Bối Cảnh

Đây là Phase cuối cùng trong MVP V1 ROADMAP. Mục tiêu: tạo một structured contract dành cho AI đọc trước khi thực thi lệnh người dùng. AI không là source of truth — mà đọc understanding từ LightBI.

Theo ROADMAP: "AI reads understanding first. AI does not become the source of truth."

---

## Scope

Chỉ tạo / sửa:
- `apps/desktop/src/lib/ai-briefing-contract.ts` (Tạo mới)
- `apps/desktop/src/lib/ai-briefing-generator.ts` (Tạo mới)
- `apps/desktop/src/lib/ai-briefing-generator.test.ts` (Tạo mới)

KHÔNG được sửa:
- Bất kỳ UI component nào
- Bất kỳ file execution/server nào
- DatasetUnderstanding pipeline

---

## Yêu Cầu Code

### 1. `apps/desktop/src/lib/ai-briefing-contract.ts`

```ts
import type { DatasetGrain } from './dataset-understanding-contract';

export interface AISemanticField {
  canonicalId: string;
  label: string;
  domain: string;
  role: "dimension" | "measure" | "time" | "unknown";
  confidence: number;
}

export interface AISafeBriefing {
  datasetId: string;
  generatedAt: string;
  grain: DatasetGrain;
  grainEvidence: string;
  readinessTier: string;
  readinessScore: number;
  semanticFields: AISemanticField[];
  caveats: string[];
  safeActionHints: string[];
}
```

### 2. `apps/desktop/src/lib/ai-briefing-generator.ts`

```ts
import type { DatasetUnderstanding } from './dataset-understanding-contract';
import type { AISafeBriefing, AISemanticField } from './ai-briefing-contract';
import { getSignalType } from './business-signal-detector';

export function generateAIBriefing(understanding: DatasetUnderstanding): AISafeBriefing {
  // 1. Map detectedConcepts → semanticFields (dùng getSignalType để lấy role)
  // 2. Lấy grain, grainEvidence từ understanding
  // 3. Lấy readinessTier, readinessScore từ understanding.readiness
  // 4. Caveats: merge understanding.caveats + understanding.readiness?.caveats (dedup)
  // 5. safeActionHints: derive từ understanding.opportunities (lấy label của những opportunity có confidence = 'high' hoặc 'medium')
  //    Format: "Can {opportunity.label}" — giới hạn tối đa 5 hints
  // 6. datasetId: understanding.datasetId hoặc understanding.id
}
```

### 3. `apps/desktop/src/lib/ai-briefing-generator.test.ts`

Test case bắt buộc:

**Test 1: Delivery dataset → semanticFields có driver, route, shipment**
```ts
it('generates briefing with semantic fields from detected concepts', () => {
  const understanding = { /* mock với detectedConcepts, grain='event', readiness */ };
  const briefing = generateAIBriefing(understanding);
  expect(briefing.grain).toBe('event');
  expect(briefing.semanticFields.length).toBeGreaterThan(0);
  expect(briefing.safeActionHints.length).toBeGreaterThan(0);
});
```

**Test 2: Empty understanding → briefing vẫn trả về nhưng semanticFields = []**
```ts
it('handles empty understanding gracefully', () => {
  const understanding = { /* mock với 0 detectedConcepts, grain='unknown' */ };
  const briefing = generateAIBriefing(understanding);
  expect(briefing.semanticFields).toHaveLength(0);
  expect(briefing.grain).toBe('unknown');
});
```

**Test 3: Caveats dedup chính xác**
```ts
it('deduplicates caveats from understanding and readiness', () => {
  // cả 2 nguồn cùng có 1 caveat giống nhau
  const briefing = generateAIBriefing(understandingWithDupCaveats);
  expect(briefing.caveats.filter(c => c === 'No time detected.').length).toBe(1);
});
```

---

## Verification Commands

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. Test Phase 6
pnpm exec vitest run src/lib/ai-briefing-generator.test.ts

# 2. TypeScript check
npx tsc --noEmit

# 3. Full suite — 0 regression
pnpm test
```

---

## Handoff Requirements

Khi xong:
- `AGENT_HANDOFF.md`: Cập nhật Phase 6 → ✅ Complete. MVP V1 ROADMAP: ALL PHASES DONE.
- `AGENT_OUTBOX.md`: Output test.
- `CHANGELOG.md`: Thêm entry "Phase 6 — AI Semantic Briefing Contract".
- Git commit: `feat(ai): Phase 6 — AI Semantic Briefing Contract`
