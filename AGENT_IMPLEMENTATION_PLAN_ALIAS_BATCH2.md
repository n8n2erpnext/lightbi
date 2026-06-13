# Agent Implementation Plan: Alias Batch 2

## 1. Top 2 Alias Failures Còn Lại
Dựa trên báo cáo Phase 1, có 2 điểm đứt gãy chính cần phân định rõ giữa giới hạn cấu trúc (Affix) và giới hạn từ vựng (Taxonomy):
1. **Miss Time & Code Identifiers (Lỗi Cấu Trúc Affix):** Các cột chuẩn hóa mang hậu tố phân loại (`product_code`, `route_no`) hoặc thời gian (`order_date`, `report_time`) vẫn bị bỏ lỡ. Điều này cản trở việc tự động nhận diện `timeDimension` cho các phép tính Trend.
2. **Finance Domain Zero Signals (Lỗi Từ Vựng & Cấu Trúc):** Dataset `good_finance.csv` rơi vào trạng thái 0 signal. Cần phân định trung thực:
   - **Phần Batch 2 cứu được:** Các biến thể cấu trúc như `total_revenue`, `expense_amount` (nếu `revenue`, `expense` đã có trong taxonomy).
   - **Phần Batch 2 KHÔNG cứu được:** Nếu file dùng các từ vựng hoàn toàn nằm ngoài Taxonomy hiện tại (ví dụ: `ebitda`, `cogs`, `net_income`), Batch 2 (chỉ chuyên xử lý affix) sẽ không thể map được. Phần này thuộc về "Taxonomy Alias Gap" và phải chờ đợt mở rộng từ vựng riêng.

## 2. Batch 2 Patterns: Allowed & Forbidden
**Được phép thêm (Chỉ định rõ Prefix & Suffix):**
Các token dưới đây được phép hoạt động cả dưới dạng **Suffix** (vd: `order_date`) và **Prefix** (vd: `total_revenue`), miễn là có ranh giới cắt chữ rõ ràng (`_`, `-`, khoảng trắng).
- **Time/Dates:** `date`, `time`
- **Measures:** `qty`, `count`, `total`
- **Dimensions:** `code`, `no`, `num`, `ref`

**Vẫn Cấm (Forbidden):**
- Tuyệt đối cấm các affixes mơ hồ mang tính group/phân loại: `type`, `category`, `group`, `class`.
- Tuyệt đối không ngầm trộn Taxonomy Expansion (thêm từ mới hoàn toàn vào từ điển) trong phase này. Scope chỉ tập trung vào Affix Stripping an toàn.

## 3. False-Positive Guardrails (Khóa an toàn chặt chẽ)
Batch 2 áp dụng quy tắc Type-Aware nghiêm ngặt nhất để ngăn chặn rò rỉ chéo:
- **Time Guardrail:** Chỉ cho phép strip affix `date`, `time` **NẾU VÀ CHỈ NẾU** signal đích có type là `time` (ngăn `revenue_date` map thành `revenue` measure).
- **Measure Guardrail:** Chỉ cho phép strip affix `qty`, `count`, `total` **NẾU VÀ CHỈ NẾU** signal đích có type là `measure` (ngăn `customer_count` map bậy thành `customer` dimension).
- **Dimension Guardrail:** Chỉ cho phép strip affix `code`, `no`, `num`, `ref` **NẾU VÀ CHỈ NẾU** signal đích có type là `dimension`.
- **Match Exactness Guardrail:** Cấm strip nếu phần chữ còn lại quá ngắn (< 3 ký tự) hoặc phần chữ còn lại **không match chính xác 100%** với một alias đang có sẵn trong Taxonomy.

## 4. File Dự Kiến Sửa
- `apps/desktop/src/lib/business-signal-detector.ts`
- `apps/desktop/src/lib/business-signal-detector.test.ts`
*(Không mở rộng scope sang file khác)*

## 5. Acceptance Criteria Đo Được
- **Positive Maps:** Phải map đúng các cột sau: `order_date` -> `order`, `report_time` -> `report_date`, `product_code` -> `product`, `route_no` -> `route`, `stock_qty` -> `stock_qty` (nếu taxonomy base là stock_qty), `total_revenue` -> `revenue`.
- **Negative Rejects:** KHÔNG tạo false positive cho `product_type`, `customer_group`, `category_code`.
- **Regression:** Các test case tiếng Việt (`business-signal-detector.real-vietnamese.test.ts`) vẫn pass 100%, không bị tiếng Anh làm hỏng.
- **Audit Verification:** Phải chạy lại subset của `DOMAIN_CORE_AUDIT_REPORT.md` tối thiểu cho các file `good_` bị ảnh hưởng, chứng minh Readiness Score tăng thật và liệt kê được sự thật về `good_finance.csv`.
