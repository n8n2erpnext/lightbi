# Measure Typing Feasibility Audit Phase 1B: Numeric Trust Probe

## 1. Context & Probe Objectives
This probe evaluates how the DuckDB execution engine handles dirty real-world numeric formats (like Vietnamese currency and "N/A" strings) when subjected to `CAST`, `TRY_CAST`, and `REPLACE` functions. The goal is to determine if bypassing type ignorance with a global `TRY_CAST` is a safe path for MVP.

## 2. Probe Scenarios & Results

| Field Type | Raw Value | `CAST(x AS DOUBLE)` | `TRY_CAST(x AS DOUBLE)` | `TRY_CAST(REPLACE(x, ',', '') AS DOUBLE)` | `SUM` output |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sales (Dirty)** | `"1,000,000"` | 🚨 **CRASH** (Conversion Error) | `NULL` | `1000000.0` | Exact sum (if comma removed) |
| **Sales (VN)** | `"1.000.000đ"` | 🚨 **CRASH** | `NULL` | `NULL` (due to `.`) | `NULL` (Silent Data Loss) |
| **Sales (Text)** | `"N/A"` | 🚨 **CRASH** | `NULL` | `NULL` | Ignored |
| **Quantity (Clean)**| `12` | `12.0` | `12.0` | `12.0` | Exact sum |

## 3. Core Findings & Answers

1. **`TRY_CAST` cứu được gì?**
   - Nó cứu được **Executor Crash** (`DUCKDB_UNKNOWN_RUNTIME_ERROR`). Hệ thống sẽ không bao giờ bị fail-fast sụp đổ toàn bộ chỉ vì một vài dòng rác ("N/A", "Unknown"). Bảng dữ liệu hoặc biểu đồ vẫn có thể render được phần dữ liệu hợp lệ.

2. **`TRY_CAST` che giấu rủi ro gì?**
   - **Silent Data Loss (Mất dữ liệu âm thầm)**. Đây là ác mộng của hệ thống BI. Nếu 90% cột `revenue` dùng định dạng Việt Nam (`1.000.000đ`), `TRY_CAST` sẽ biến tất cả thành `NULL`. Hàm `SUM()` sẽ bỏ qua các dòng `NULL` này và tính tổng 10% còn lại. UI sẽ hiển thị "Tổng doanh thu: 50.000" (thay vì 50 tỷ) mà không hề có bất kỳ cảnh báo đỏ nào. Người dùng sẽ đưa ra quyết định sai lầm thay vì biết hệ thống đang lỗi.

3. **`SUM` có đáng mở trước không?**
   - **CÓ THỂ**, nhưng kèm điều kiện ngặt nghèo. Mở `SUM` trước dễ verify hơn `AVG` vì người dùng nhìn vào tổng (Sum) bị hụt sẽ dễ nhận ra dữ liệu thiếu hơn so với số trung bình (Avg) bị lệch ngầm. Tuy nhiên, tuyệt đối không được mở `SUM` toàn cục mà chỉ mở cho các cột đã vượt qua bộ lọc **Dataset Health Profiling** (ví dụ: `numeric_parse_rate > 90%`).

4. **`AVG` có nên hoãn không?**
   - **NÊN HOÃN**. `AVG` cực kỳ nguy hiểm với `TRY_CAST`. `AVG(100, 100, NULL, NULL)` sẽ trả về `100` (DuckDB bỏ qua `NULL` khi đếm mẫu số). Nếu 2 dòng `NULL` kia lẽ ra là `0` (ví dụ đơn hàng bị hủy), `AVG` thực tế phải là `50`. Việc ngầm hiểu `NULL` trong phân tích trung bình sẽ bóp méo hoàn toàn xu hướng. 

## 4. Architectural Decision
Không được sử dụng `TRY_CAST` như một liều thuốc giảm đau mù quáng ở SQL Generator. 
Để an toàn mở `SUM`, hệ thống bắt buộc phải:
1. Đọc tỷ lệ `null` / `parse_rate` ở tầng **Dataset Health**.
2. Nếu tỷ lệ rác quá cao, hạ điểm **Decision Readiness** xuống mức rủi ro, đẩy warning ra UI (Caveats) để báo cho người dùng biết "Cột Doanh Thu có 40% giá trị không thể tính toán".
3. Chỉ khi nào metadata xác nhận cột này là "Safe Numeric", SQL Generator mới được phép sinh ra mệnh đề `SUM(TRY_CAST(...))`.
