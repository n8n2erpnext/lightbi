# AGENT_IMPLEMENTATION_PLAN_TRUST_MAPPING_REVIEW

## 1. Mục tiêu MVP của Trust & Mapping Review
Cung cấp một bước "kiểm duyệt sự thật" (Truth Review) để người dùng xem xét, xác nhận hoặc điều chỉnh cách LightBI hiểu dữ liệu (từ cột vật lý sang business signal) trước khi hệ thống đưa ra các phân tích. Mục tiêu là ưu tiên sự minh bạch ("report truth before runtime ambition") thông qua việc phân loại chính xác các tín hiệu mà hệ thống chưa chắc chắn, cho phép người dùng can thiệp an toàn ở mức memory (overlay).

## 2. Contract Output Tối Thiểu
Cần mở rộng hoặc bổ sung vào `DatasetUnderstanding` một `MappingReviewContract` chứa:
- `physicalColumn`: Tên cột gốc.
- `inferredSignal`: Canonical signal được gán (nếu có).
- `issueType`: Phân loại trạng thái mapping (xem mục 3).
- `confidence`: Điểm tự tin của phép gán.
- `suggestedActions`: Các hành động khắc phục tạm thời.

## 3. Các Loại Issue Phải Báo Cho User
Hệ thống không được tự ý che giấu lỗi mà phải phân loại rõ:
- **`recognized`**: Nhận diện tốt, mapping rõ ràng, có thể dùng ngay.
- **`ambiguous`**: Cột gốc có thể map vào nhiều signal khác nhau, hoặc độ tự tin ở mức ranh giới.
- **`unrecognized`**: Không map được vào bất cứ domain knowledge nào.
- **`conflicting`**: Nhiều cột vật lý cùng tranh chấp một canonical signal (vd: hai cột cùng map ra `revenue`).
- **`recoverable`**: Bị thiếu một signal quan trọng nhưng có hint để người dùng tự gán tay từ một cột `unrecognized`.

## 4. Các User Options Tối Thiểu & Quản Lý State (Overlay)
Tất cả các hành động này **chỉ là overlay tạm thời trong session state của React/memory**, tuyệt đối không ghi đè hay sửa đổi file raw CSV:
- **`map tạm`**: Gán thủ công một cột `unrecognized` hoặc `ambiguous` vào một canonical signal.
- **`merge tạm`**: Chỉ định gộp ý nghĩa của các cột đang bị `conflicting`.
- **`ignore mismatch`**: Bỏ qua các cột lỗi/không nhận diện được để tiếp tục phân tích với các phần data còn lại.
- **`keep raw unchanged`**: Từ chối mọi đề xuất map, giữ nguyên trạng thái gốc (chấp nhận hạ cấp xuống Exploratory use only).

**Nơi lưu giữ Overlay State**:
Trạng thái mapping thay thế sẽ được lưu giữ tại một store hoặc helper mới để tách biệt logic khỏi UI:
- Tạo mới file `apps/desktop/src/lib/mapping-overlay-state.ts` (quản lý state mapping ghi đè của người dùng).
- `Home.tsx` sẽ đóng vai trò là container chính, gọi helper state này và trigger quá trình recompute (tính toán lại DatasetUnderstanding và Readiness Score cục bộ) mỗi khi người dùng áp dụng một action.

## 5. Danh Sách File Dự Kiến Sửa Lỗi (Phase Đầu)
- `apps/desktop/src/lib/dataset-understanding-contract.ts` (Khai báo `MappingReviewContract` và các trạng thái issue).
- `apps/desktop/src/lib/business-signal-detector.ts` (Thu thập và trả về chi tiết phân loại trạng thái mapping).
- Mới: `apps/desktop/src/lib/mapping-overlay-state.ts` (Lưu giữ trạng thái overlay của user actions).
- `apps/desktop/src/pages/Home.tsx` (Tích hợp state overlay và recompute pipeline cục bộ).
- Mở rộng UI: `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx` (Hoặc tạo thẻ UI mới `MappingReviewPanel.tsx` hiển thị trạng thái review).

## 6. Acceptance Criteria Đo Được (Đã Sửa)
- Khi truyền dataset, trạng thái phân loại 5 loại issue (`recognized`, `ambiguous`, `unrecognized`, `conflicting`, `recoverable`) xuất hiện chính xác trong `MappingReviewContract` trả về.
- Mọi thao tác user action (map tạm, ignore, merge) chỉ cập nhật overlay state tại `mapping-overlay-state.ts` và không làm thay đổi hay ghi đè một byte nào trên file raw CSV gốc.
- Ngay sau khi user chọn một action trên review panel, `Readiness Score` và các Opportunity (nếu có) được **recompute cục bộ (local/session recomputation)** và UI phản hồi ngay lập tức.
- Tuyệt đối không mở rộng scope sang backend, runtime execution hay DuckDB. Mọi thay đổi đều được cách ly ở mảng "hiểu dữ liệu" (understanding/readiness layer).
