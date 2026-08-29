# Guarded SUM Rollout Audit

## 1. Mục tiêu và Bối cảnh (Objective & Scope)
Tiến hành audit độc lập luồng thực thi Guarded SUM xuyên suốt từ tầng Intent/Planner xuống tận DuckDB WASM Executor. Mục đích là nhận diện các điểm đứt gãy về niềm tin dữ liệu (false trust), đặc biệt là các hành vi "silent failure" hoặc "silent coercion" vẫn còn rò rỉ sau Phase 1B.

## 2. Kết quả Audit Thực tế (Actual Runtime Reality)

### 2.1. Phân bổ Intents thực thi
- **Đang chạy Guarded SUM**: `group_by`, `trend`. Đây là 2 intent đang trực tiếp kích hoạt `enhancePlanWithGuardedSum` để nâng cấp `COUNT` lên `SUM`.
- **Chỉ chạy COUNT/SELECT (Bỏ qua Guarded SUM)**: `distribution` (hardcode `COUNT(*)`), `relationship` (không aggregate, chỉ select raw measures), và `scan` / `limit`.

### 2.2. Nhận diện các điểm "False Trust" chí mạng
1. **Sự triệt tiêu dấu thập phân (Decimal Point Destruction)**:
   - Trong `numeric-health-gate.ts` và `safe-sql-preview.ts`, cơ chế cleansing đang áp dụng `REPLACE("col", '.', '')` để loại bỏ dấu chấm phân cách hàng nghìn.
   - **Hậu quả**: Nếu dữ liệu đầu vào là `100.50` (chuẩn Mỹ - dấu thập phân), việc loại bỏ dấu chấm sẽ biến chuỗi thành `10050`. Hàm `TRY_CAST` của DuckDB sau đó sẽ nhận diện con số này là Mười Nghìn Không Trăm Năm Mươi thay vì Một Trăm Phẩy Năm. Sai số gấp 100 lần nhưng hệ thống vẫn tự tin cảnh báo là "an toàn" do `parse_rate` cao. Đây là điểm đứt gãy lớn nhất.
2. **Lệch pha Sample Size (Sample Size Discrepancy)**:
   - JS Health Gate chỉ sample 500 dòng đầu tiên để đánh giá `parseSuccessRate`. Nếu 500 dòng đầu hoàn hảo, `isSafeForSum` = true và không có cảnh báo.
   - Khi DuckDB chạy SQL quét 1 triệu dòng, nếu dòng thứ 600 chứa chuỗi dị dạng không thể `TRY_CAST`, DuckDB sẽ âm thầm trả về `NULL` và bỏ qua trong hàm `SUM`. Dữ liệu biến mất, nhưng UI không hiển thị cảnh báo cleansing vì mẫu 500 dòng đầu đã vượt trạm an toàn.
3. **Dirty Numeric Patterns Chưa Cover (Regex Blindspots)**:
   - Ký hiệu tiền tệ kỳ lạ ngoài bộ `[đ$€£]|VNĐ` (ví dụ: `¥`, `₹`, `CHF`).
   - Khoảng trắng tàng hình (Non-breaking spaces `\u00A0`). SQL hiện chỉ `REPLACE(' ', '')` khoảng trắng thường.

### 2.3. Các đường thực thi cần Audit (Execution Paths)
- **Cần audit rát nhất**: Mũi nhọn `local-duckdb-executor.ts` (WASM path) và `backend-preview-executor.ts`. Nguyên nhân là SQL text do `safe-sql-preview.ts` sinh ra được gửi nguyên xi xuống đây. Nếu SQL đã chứa sai lầm logic (như xóa dấu thập phân), engine sẽ thực thi sai lầm đó một cách hoàn hảo. JS Sandbox ít rủi ro hơn vì nó không dùng chuỗi SQL này mà dùng hàm JS `parseFloat`.

## 3. Matrix Kiểm chứng (Audit Matrix)

| Intent | Measure Sample Pattern | Health Gate Outcome | SQL Aggregate Path | Expected Warning Behavior | Possible Failure Mode | Trust Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `group_by` | Revenue: `["1.000,50€", "500,00€"]` (EU Format) | `isSafe=true`, `needsCleansing=true` | `SUM(TRY_CAST(REPLACE(...) AS DOUBLE))` | Cảnh báo: "Underwent silent cleansing" | **Decimal Destruction**: Dấu chấm và phẩy bị xóa sạch. `1.000,50` biến thành `100050` (sai số x100). | **CRITICAL** |
| `trend` | Quantity: `["10", "20", "N/A"]` | `isSafe=false` (do "N/A" chiếm 33%) | `COUNT(quantity)` | Cảnh báo: KHÔNG | Downgrade xuống COUNT đúng chuẩn. Không sai lệch. | LOW |
| `group_by` | Anomaly: 500 rows `100`, then 1 row `Dirty_String` | `isSafe=true`, `needsCleansing=false` (do 500 rows đầu chuẩn) | `SUM(TRY_CAST(col AS DOUBLE))` | Cảnh báo: KHÔNG | **Silent Drop**: Row 501 bị `TRY_CAST` gán NULL. DuckDB bỏ qua. User mất tiền nhưng không hay biết. | **CRITICAL** |

## 4. Kết luận & Đề xuất (Executive Conclusion)

1. **Stream này nên đi tiếp bằng verification/stress test trước hay mở rộng feature trước?**
   - **Bắt buộc phải Stress Test & Verification trước**. Tuyệt đối không mở rộng feature khi nền móng ép kiểu đang chứa bom nổ chậm (lỗi xóa dấu thập phân & sai lệch sample size).
2. **Surface/Intent nào nên được stress-test trước?**
   - Lớp `local-duckdb-executor.ts` trên các Intent `group_by` và `trend`. Phải đẩy một luồng dữ liệu thật chứa 10,000 dòng có xen kẽ dấu thập phân và dị thường (anomalies) ở cuối file để xem DuckDB nuốt như thế nào.
3. **Có cần thêm “hard block” rule cho một số numeric patterns không?**
   - **Có**. Cần một hard block phân tách minh bạch giữa Dấu chấm thập phân (Decimal point) và Dấu phân cách hàng nghìn (Thousands separator). Không thể mù quáng dùng `REPLACE('.', '')` cho toàn bộ các locale được.

---

### Báo cáo Tổng kết Nhanh:
1. **Guarded SUM hiện an toàn nhất ở intent nào**: `distribution` và `relationship` (vì chúng đang hoàn toàn bypass Guarded SUM và sử dụng raw COUNT/SELECT). Trong nhóm có SUM, `group_by` với pure integers là an toàn nhất.
2. **Dirty numeric pattern đáng lo nhất hiện tại**: Các con số có chứa dấu chấm phẩy xen lẫn (`1.000.000,50`) đang bị cơ chế cleansing triệt tiêu hoàn toàn dấu thập phân, dẫn đến sai số nhân x10, x100.
3. **Local DuckDB path có cần stress-test riêng không**: Vô cùng khẩn thiết. DuckDB WASM sẽ âm thầm `TRY_CAST` ra NULL nếu gặp anomaly nằm ngoài 500 rows đầu tiên, gây mất mát dữ liệu ngầm cực kỳ tinh vi.
4. **Bước tiếp theo**: Khởi động chiến dịch Stress-Test (bơm data bẩn trực tiếp vào DuckDB WASM) thay vì mở rộng feature.
