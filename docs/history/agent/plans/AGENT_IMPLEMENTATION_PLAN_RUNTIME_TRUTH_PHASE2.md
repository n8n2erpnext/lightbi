# Agent Implementation Plan: Runtime Truth Phase 2 (Backend Hardening)

## 1. Top 2 Backend/Runtime Failures Cần Xử Lý Tiếp
1. **DuckDB/Backend Path Fail (Khủng hoảng Fallback):** Hệ thống sinh câu lệnh (SQL compiler/planner) của DuckDB quá giòn, tạo ra các câu SQL lỗi cú pháp hoặc tham chiếu sai cột khi gặp các logic phân tích chuẩn. Việc này khiến engine liên tục crash và đẩy phần lớn khối lượng phân tích xuống `js_sandbox_fallback` (vốn chỉ là một giải pháp tình thế, bị gắn nhãn degraded).
2. **Result Quality / Shape Mismatch:** Khi DuckDB may mắn chạy thành công, kết quả trả về thường không khớp với intent (e.g. yêu cầu trend có time dimension nhưng SQL lại select thiếu, hoặc group_by nhưng không group đúng column), dẫn tới việc bị chốt chặn (Phase 1 Boundary Validator) từ chối vì không đạt tiêu chuẩn shape.

## 2. Các File Dự Kiến Sửa (Chỉ Backend/Runtime Hardening)
- `apps/desktop/src/lib/duckdb-preview-runtime.ts` (Sửa logic thực thi DuckDB, error recovery)
- `apps/desktop/src/lib/safe-sql-compiler.ts` (Sửa lại bộ sinh SQL để build đúng các truy vấn Group By, Trend, Relationship mà không bị lủng)
- `apps/desktop/src/lib/safe-sql-compiler.test.ts` (Cập nhật test chứng minh compiler sinh đúng SQL)
- `apps/desktop/src/lib/duckdb-preview-runtime.test.ts` (Bổ sung test runtime)

## 3. Acceptance Criteria (Đo Được)
- **Tỉ lệ dùng Fallback giảm:** Các business view cốt lõi (như Group By, Trend, Relationship) phải được dịch ra SQL an toàn và chạy thành công trên mô phỏng DuckDB mà không bị đá văng sang js_sandbox_fallback.
- **SQL Sinh ra chuẩn Shape:** File test phải chứng minh `safe-sql-compiler` sinh câu lệnh `SELECT`, `GROUP BY`, `ORDER BY` đầy đủ cột tương ứng với `dimensions` và `measures` đã yêu cầu từ `RuntimeIntent`.
- **Vượt qua Validation Boundary:** Kết quả chạy từ DuckDB phải pass được bộ lọc `validatePreviewAgainstIntent` (đạt điểm confidence > 85), khiến Investigation UI hiển thị chart thành công thay vì thông báo "Execution Boundary Failed".

## 4. Vì Sao Phase Này Phải Đi Ngay Sau Runtime Truth Phase 1?
Trong Phase 1, chúng ta đã xây được một "chiếc gương" trung thực trên UI để lột trần các thất bại của hệ thống (nó sẽ thẳng thừng chê bai các kết quả hỏng hoặc báo degraded). Nếu không tiến hành "Hardening" cái backend ngay lúc này, người dùng sẽ liên tục nhìn thấy màn hình báo đỏ "Failed" hoặc "Degraded". Ta phải sửa tận gốc bộ máy sinh SQL để hệ thống thực sự tạo ra được các chart xịn, trả lại sự tự tin cho sản phẩm trước khi bơm thêm từ khoá nhận diện ở Batch 2.

---
*(Ghi chú: Phase này nghiêm ngặt chỉ sửa luồng sinh/chạy SQL của DuckDB. Không đụng tới Home Layer, không đụng tới Batch 2 Alias, không redesign biểu đồ).*
