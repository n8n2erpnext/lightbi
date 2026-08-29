# Agent Implementation Plan: Trust & Mapping Phase 2

## 1. Mục tiêu (Nguyên tắc cực hẹp)
Nâng cấp Mapping Review từ "hiển thị + overlay cơ bản" lên mức **"mapping correction có ích thật"**, trao toàn quyền quyết định mapping cho người dùng để họ có thể tự fix các lỗi mismatch.
- **Không** đụng backend/DuckDB/Alias/UI redesign.
- Tái sử dụng toàn bộ luồng Session Overlay và Local Recompute đã dựng ở Phase 1.

## 2. Top 2 Mapping Failures cần giải quyết
Dựa trên báo cáo Phase 1 và Runtime Truth:
1. **User chưa thể tự chọn Custom Signal:** Hiện tại overlay chỉ cho map dựa trên suggestion có sẵn. Các cột `unrecognized` bị kẹt cứng vì người dùng không thể tự mở danh sách toàn bộ Catalog để gán tay (ví dụ gán "amount_usd" thành `revenue`).
2. **Overlay Correction chưa đủ mạnh để "cứu" Readiness:** Thiếu cơ chế phản hồi rõ ràng (Immediate UI Feedback) cho user thấy rằng hành động map tay của họ đã "cứu" (upgrade) được Readiness Score và mở khóa các cơ hội (Opportunities) bị chặn trước đó.

## 3. Vì sao Phase này đi ngay sau Runtime Truth Checkpoint?
Vì Runtime Truth Phase 1 & 2 đã **thắt chặt** các ranh giới: hệ thống giờ sẽ *Fail-fast* và block gắt gao các query bị thiếu/sai logic do mapping lỗi (không còn chế độ fallback giả mạo). Do đó, Trust Mapping Phase 2 là nút gỡ rối duy nhất: cung cấp công cụ để người dùng chủ động map đúng các cột, từ đó cung cấp "nguyên liệu sạch" vượt qua các cổng kiểm duyệt (boundary validator) của Runtime Truth.

## 4. Các file dự kiến sửa
- `apps/desktop/src/lib/mapping-overlay-state.ts` (Mở rộng overlay state logic cho phép gán custom/freeform signal id).
- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx` (Thêm UI Dropdown/Picker cho phép chọn manual signal cho các cột `unrecognized` / `ambiguous`).
- `apps/desktop/src/lib/business-signal-detector.ts` (Có thể cần expose list canonical signals cho UI Picker).
- `apps/desktop/src/lib/mapping-overlay-state.test.ts` & `apps/desktop/src/components/analysis/DatasetUnderstandingCard.test.tsx` (Bổ sung test cho custom manual signal mapping).

## 5. Acceptance Criteria (Đo lường được)
- **AC1 (Logic):** Overlay State chấp nhận một action mới dạng `map_to_custom_signal`, lưu lại binding giữa `physicalColumn` và `customSignalId` vào memory.
- **AC2 (UI):** Trên `DatasetUnderstandingCard`, với một cột `unrecognized`, xuất hiện dropdown liệt kê các available signals. Khi chọn, gọi dispatch action mới.
- **AC3 (Recomputation):** Bất kỳ manual binding nào cũng phải trigger luồng `createDatasetUnderstanding`, nâng `Readiness Score` và thay đổi danh sách `Opportunities` một cách minh bạch (proven qua test case).
- **AC4 (Boundary):** Đảm bảo zero type errors mới và không phá vỡ overlay state test hiện tại.
