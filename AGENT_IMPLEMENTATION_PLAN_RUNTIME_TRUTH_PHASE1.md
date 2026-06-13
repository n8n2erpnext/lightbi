# Agent Implementation Plan: Runtime Truth Phase 1 (Revised)

## 1. Top 2 Runtime Truth Failures Cần Xử Đầu Tiên
1. **Investigation Silent Failures / Trạng thái ảo:** Trang Investigation không biểu đạt đủ rõ trạng thái sự thật khi execution thực tế bị hỏng, rỗng hoặc bị giáng cấp (degraded/fallback). User bấm chạy preview nhưng nhận lại màn hình im lặng hoặc chart vô nghĩa mà không có cảnh báo.
2. **Thiếu Boundary Contract / Validation Rõ Ràng:** Lỗ hổng ở ranh giới giữa việc chọn action phân tích và kết quả runtime trả về. System thiếu một validation layer đủ mạnh để bắt các preview result yếu/lỗi trước khi render ra UI, dẫn đến mất cân xứng giữa "Promise" (View được chọn) và "Execution Truth".

## 2. File Dự Kiến Chạm Tới (Tập Trung Runtime Boundary)
- `apps/desktop/src/pages/Investigation.tsx` (Xử lý UI state: unavailable, degraded execution, failed preview)
- `apps/desktop/src/lib/backend-preview-executor.ts` (Gắn cờ trạng thái execution thực tế: fallback, partial, failed)
- `apps/desktop/src/lib/runtime-boundary-contract.ts` (Định nghĩa rõ cấu trúc ranh giới giữa intent và runtime output)
- `apps/desktop/src/lib/result-validator-contract.ts` (Validation rule để đánh giá chất lượng preview result trả về)
- Các file test tương ứng (VD: `apps/desktop/src/lib/backend-preview-executor.test.ts`, `apps/desktop/src/pages/Investigation.test.tsx` nếu có)

*Lưu ý: Không chạm lại `DatasetUnderstandingCard.tsx` hay `dataset-understanding-contract.ts` thuộc Home layer.*

## 3. Acceptance Criteria (Cụ thể, Đo được)
- **Minh bạch trạng thái (Execution Truth Transparency):** Khi preview fail hoặc chạy ở chế độ degraded (fallback JS), trang Investigation bắt buộc phải hiển thị cảnh báo/label trạng thái rõ ràng, không để user hiểu nhầm là dữ liệu xịn từ engine chính.
- **Không có UI câm (No Silent States):** Nếu result trả về rỗng hoặc vô nghĩa (không đủ rows, lỗi SQL), UI phải báo lỗi execution / unavailable thay vì vẽ một chart trắng.
- **Validation Contract hoạt động:** Viết test chứng minh `result-validator-contract` hoặc `backend-preview-executor` có thể phân loại chính xác một `PreviewResult` thành các mức độ: `success`, `degraded`, `failed`.

## 4. Vì Sao Phase Này Phải Đi Trước Alias Batch 2?
Mở rộng Alias (Batch 2) sẽ xúi giục hệ thống đẩy càng nhiều dữ liệu hơn vào trang Investigation để chạy phân tích. Nếu Investigation UI chưa có rào cản trung thực (không biết cách nói "Tôi chạy lỗi rồi"), user sẽ liên tục va phải các bảng phân tích gãy hỏng do Alias matching tạo ra nhưng Runtime không gánh nổi. Xây chốt chặn trung thực tại Investigation giúp bảo vệ user khỏi ảo giác sức mạnh trước khi nhồi thêm tín hiệu.

---
*(Ghi chú: Phase này chỉ dựng vách ngăn trung thực ở UI Investigation và Contract, không can thiệp viết lại DuckDB engine hay sửa big UI redesign).*
