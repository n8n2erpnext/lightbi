# Agent Handoff: Runtime Truth Phase 1

## 1. Scope Implemented
- Thiết lập ranh giới trung thực (Truth Boundary) giữa quá trình Investigation và Runtime Execution.
- Cập nhật Investigation UI để biểu đạt rõ 3 trạng thái sự thật khi chạy preview: "Failed/Rejected", "Empty Dataset", và "Degraded Fallback".
- Áp dụng `ResultValidatorContract` để đánh giá chất lượng preview so với `RuntimeIntent` (intent ban đầu).

## 2. Files Changed
- `apps/desktop/src/pages/Investigation.tsx`: Thêm logic check empty rows, check fallback source, check validator boundary và render UI tương ứng.
- `apps/desktop/src/lib/result-validator-contract.ts`: Thêm helper `validatePreviewAgainstIntent` làm cầu nối giữa Intent và Preview Result.
- `apps/desktop/src/pages/Investigation.test.tsx`: (Tạo mới) Test suite chứng minh UI phản hồi đúng với các trạng thái truth.

## 3. Tests Run & Compile Status Truth
- `npx tsc -p apps/desktop/tsconfig.app.json --noEmit`: Báo fail do các pre-existing repo errors (`audit-runner.ts` thiếu `@types/node`). KHÔNG có type error mới nào do Phase 1 gây ra.
- `npx vitest run`: Pass 100% (356/356 tests passed).

## 4. What Was Proven
- UI Investigation đã hết bị "mù" và "câm" trước các thất bại của runtime. 
- Mọi preview result có chất lượng kém, hoặc không trả về dòng dữ liệu nào, đều bị chặn đứng và gắn nhãn "Execution Failed". 
- Chế độ Fallback JS Sandbox bị vạch mặt rõ ràng bằng cảnh báo vàng "Degraded Execution Mode".

## 5. What Was Intentionally Not Implemented
- Không chạm vào `DatasetUnderstandingCard` (Home layer).
- Không mở rộng alias tiếng Việt (Batch 2).
- Không sửa lỗi tận gốc bên trong hệ thống sinh SQL của DuckDB.

## 6. Remaining Limits
- Engine DuckDB vẫn đang rất yếu và thường xuyên sinh SQL lỗi khiến hệ thống rơi vào trạng thái Fallback hoặc Failed.
- Khả năng nhận diện alias vẫn giữ ở mức hẹp, bỏ lỡ nhiều keyword mở rộng.
