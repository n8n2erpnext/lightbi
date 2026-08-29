# Next Stream Plan: Safe SQL / Numeric Trust Continuation

## 1. Product Value Prioritization
Sau khi hoàn tất định dạng hiển thị ở tầng Presentation (Global Display Preferences), giá trị product cao nhất hiện nằm ở **Sự tin cậy của dữ liệu** (Data Trust). Người dùng đang nhìn thấy những con số được định dạng đẹp mắt, nhưng họ không biết liệu con số gốc sinh ra từ câu SQL có đáng tin cậy hay đã bị "ép kiểu" / "cắt xén" do dữ liệu bẩn. Việc minh bạch hóa quá trình làm sạch dữ liệu (cleansing) mang lại giá trị cốt lõi sống còn cho một sản phẩm BI.

## 2. Guarded SUM: Next Phase
Guarded SUM hiện đã vượt qua Phase 1 (SQL-side cleansing: tự động loại bỏ ký tự rác khi thực hiện hàm SUM với điều kiện `parse_rate >= 95%`). 
Phase tiếp theo bắt buộc phải là **Phase 1B: Warning Propagation**. Tức là, cảnh báo phải được truyền tải từ backend DuckDB/SQL parser lên tới tận tay người dùng qua UI.

## 3. Warning Propagation cho Numeric Cleansing
Việc đưa Warning Propagation lên trước là **cực kỳ cấp thiết**. Hiện tượng "Silent Cleansing" (làm sạch dữ liệu trong im lặng) là một trong những rủi ro lớn nhất của BI. Nếu hàm SUM loại bỏ 4% dòng dữ liệu không hợp lệ mà người dùng không được thông báo, họ có thể đưa ra quyết định sai lầm dựa trên tập dữ liệu thiếu hụt. UI (cụ thể là Investigation table và chart) phải hiển thị rõ biểu tượng cảnh báo (ví dụ: tooltip vàng) chỉ rõ cột nào đã bị ép kiểu và tỷ lệ rớt là bao nhiêu.

## 4. Visual Regression: Stream Riêng hay QA Sub-branch?
Visual Regression Screenshots (Playwright/Cypress) đòi hỏi thiết lập hạ tầng CI/CD, image baseline storage, và browser drivers. Vì vậy, nó nên được tách thành một **Stream Riêng biệt (QA Automation Stream)** thay vì nhét chung vào nhánh phát triển tính năng (Feature Stream). Kỹ sư QA/Automation sẽ chạy song song stream này để không cản trở tốc độ xuất xưởng của các tính năng cốt lõi.

---

## 5. Executive Conclusion

**Ưu tiên số 1 ngay bây giờ là stream nào?**
**`Warning Propagation for Guarded SUM (Phase 1B)`**

**Vì sao?**
Bởi vì "Trust" (niềm tin) quan trọng hơn "Aesthetics" (thẩm mỹ). Global Display Preferences đã hoàn thành xuất sắc vai trò làm đẹp và bản địa hóa số liệu. Tuy nhiên, một con số đẹp nhưng bị sai lệch ngầm do quá trình ép kiểu (silent coercion) sẽ phá hủy uy tín của LightBI. Mở khóa Warning Propagation ngay lập tức sẽ đóng kín vòng lặp an toàn, giúp người dùng vừa có số liệu đẹp, vừa biết chính xác sức khỏe của phép toán tổng hợp mà hệ thống vừa tính thay họ.
