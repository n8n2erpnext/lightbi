# Guarded SUM Stress Test Phase 1 Report

## 1. Executive Summary
An isolated stress test was executed against the `Guarded SUM` logic path using a simulated JS/DuckDB SQL execution harness. The goal was to validate the resilience of the `numeric-health-gate` and the `safe-sql-preview` string coercion logic against clean, locale-mixed, dirty currency, and anomalous numeric patterns.

**Core Findings**:
- The safety mechanisms successfully block pure garbage and generate accurate warnings for straightforward string stripping.
- However, the system exhibits **Critical False Trust** when handling decimal points and thousands separators. 
- The system is also vulnerable to **Silent Drops** due to the 500-row sample limitation.

## 2. Execution Matrix Results

### Category 1: Safe
| Intent | Measure Sample Pattern | Health Gate | SQL Aggregate Path | Warning | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clean Int** | `["1000", "2000"]` | `isSafe=true`, `needsCleansing=false` | `SUM` | None | Expected: `3000`. Actual: `3000`. |
| **USD Currency** | `["$1,000", "$2,000"]` (No Decimals) | `isSafe=true`, `needsCleansing=true` | `SUM` | Yes | Expected: `3000`. Actual: `3000`. (Comma/Symbol stripped cleanly). |

### Category 2: Unsafe but detected (Downgraded)
| Intent | Measure Sample Pattern | Health Gate | SQL Aggregate Path | Warning | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Garbage Mixed** | `["N/A", "abc", "", "   "]` | `isSafe=false` (0% parse rate) | `COUNT` | None | System correctly identified garbage and downgraded to COUNT. No false data. |

### Category 3: Unsafe and NOT detected (FALSE TRUST & SILENT DROP)
| Intent | Measure Sample Pattern | Health Gate | SQL Aggregate Path | Warning | Result / Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clean Decimal** | `["1000.50", "2000.75"]` | `isSafe=true`, `needsCleansing=true` | `SUM` | Yes | **CRITICAL FALSE TRUST**: DuckDB SQL strips the `.` character. `1000.50` becomes `100050`. The SUM is inflated by 100x. |
| **EU Format** | `["1.000,50", "2.000,75"]` | `isSafe=true`, `needsCleansing=true` | `SUM` | Yes | **CRITICAL FALSE TRUST**: Both `.` and `,` are stripped. SUM is inflated by 100x. |
| **US Format** | `["1,000.50", "2,000.75"]` | `isSafe=true`, `needsCleansing=true` | `SUM` | Yes | **CRITICAL FALSE TRUST**: Both `.` and `,` are stripped. SUM is inflated by 100x. |
| **Late Row Anomaly** | 500 Clean rows, then 3 Garbage rows | `isSafe=true` (Based on 500 rows) | `SUM` | **NO** | **SILENT DROP**: DuckDB's `TRY_CAST` silently drops the 3 garbage rows to `NULL`. Because the JS sampler only saw the first 500 clean rows, no warning is surfaced to the user. |

### Category 4: Needs architectural fix
- **Decimal vs Separator Ambiguity**: The blind application of `REPLACE('.', '')` and `REPLACE(',', '')` in DuckDB completely destroys the mathematical value of floats.
- **Sampling Deficit**: The 500-row sample size in JS cannot predict the true distribution of anomalies deep within 1,000,000+ row datasets.

## 3. Conclusions

**1. Decimal separator ambiguity có phải blocker tuyệt đối không?**
- **Có, đây là một Absolute Blocker**. Hiện tại, bất kỳ số liệu nào có chứa dấu thập phân (dù là chuẩn Mỹ hay Châu Âu) đều bị nhân lên 10x, 100x do dấu phẩy/chấm bị xóa ngang bạo. Điều này biến các báo cáo tài chính thành sai lầm nghiêm trọng.

**2. Sample-size 500 có còn chấp nhận được không?**
- **Không an toàn tuyệt đối**. Nó đủ nhanh cho UX UI, nhưng nó mở ra rủi ro "Silent Drop" ở phần đuôi dữ liệu (Tail rows). DuckDB SQL thực thi trên toàn bộ tập dữ liệu nhưng UI lại chỉ cảnh báo dựa trên 500 dòng đầu.

**3. Guarded SUM hiện có nên bị thu hẹp tạm thời không?**
- **Nên tạm thời chặn Guarded SUM đối với các cột số có dấu chấm/phẩy**. Nếu chuỗi gốc chứa `.` hoặc `,`, nên gán một `hard block` rơi về `COUNT` thay vì cố gắng ép kiểu mù quáng, cho đến khi chúng ta có giải thuật Locale-Aware Cast.

**4. Bước code tiếp theo nên là gì?**
- Ưu tiên cao nhất là **Hard block locale-mixed decimals**: Thêm rule vào `numeric-health-gate.ts` để đánh rớt (fail) bất kỳ chuỗi nào chứa Dấu chấm hoặc Dấu phẩy xen kẽ, đưa thẳng về `COUNT` để ngăn chặn False Trust.
- Sau đó, có thể kết hợp **Warning Escalation** để thông báo: "Cột bị khóa không cho phép tính Tổng vì chứa định dạng số thập phân/hàng nghìn phức tạp chưa hỗ trợ".
