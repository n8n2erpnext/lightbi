# LightBI Post-Beta Multi-sheet & Dirty-data Handoff — 2026-08-13

Đây là log vào nhanh cho phiên AI kế tiếp. Đọc tài liệu này trước, sau đó đọc
`POST_BETA_AI_HANDOFF_2026-08-13.md` và các file production được liệt kê bên
dưới. Không suy diễn trạng thái hiện tại chỉ từ ADR hoặc code map lịch sử.

## Trạng thái và đường lùi

- Nhánh làm việc: `codex/beta-recovery-20260801`.
- HEAD trước đợt sửa này: `9de8e50`.
- Implementation đã kiểm thử đầy đủ: `d023e537fd6b784d63239202fa425f68a05e829c`.
- Backup trước sửa đã đẩy: `origin/backup/pre-multisheet-dirty-import-20260813`.
- Backup sau sửa: `origin/backup/post-multisheet-dirty-import-20260813` (trỏ
  tới commit bàn giao cuối có tài liệu này).
- Backup cũ vẫn giữ: `origin/backup/pre-ba-dashboard-alignment-20260813` và
  `origin/backup/post-beta-fixes-20260813`.
- Không chạm vào ZIP, PID/log và thư mục `releases/` đang untracked; đó là tài
  sản có sẵn của người dùng.

## Yêu cầu đã xử lý

1. Workbook Excel bẩn/nhiều sheet không được làm hỏng toàn bộ lần import chỉ vì
   một sheet không thể lập hồ sơ sâu.
2. Người dùng được chọn một hay nhiều sheet, hoặc yêu cầu phân tích toàn bộ
   workbook. Mỗi sheet là một nguồn độc lập; tuyệt đối không tự nối các sheet.
3. Sheet dạng bảng được ưu tiên; sheet sơ đồ/trình bày/sparse được cảnh báo.
4. Các cột tồn kho phổ biến phải được hiểu theo registry chung, không hard-code
   tên file mẫu.
5. BA, Phân tích sâu và Dashboard phải bám measure/dimension của action đã chọn;
   Dashboard không lặp lại cùng một bằng chứng dưới tên khác.
6. Nhãn số như `1..51` không được tự biến thành ngày năm 1970.
7. CTA tạo Dashboard vẫn hiển thị trên web nhưng không nằm trong ảnh/PDF xuất.

## Thiết kế import hai giai đoạn

`inspectLocalFile` hiện nhận `selectedSheetNames`:

```text
Chọn file Excel nhiều sheet
  -> đọc manifest nhẹ: tên sheet, vùng dùng, preview, độ phù hợp
  -> người dùng chọn sheet / toàn workbook
  -> chỉ profile sâu các sheet đã chọn
  -> mỗi sheet hợp lệ tạo một source + runtime File riêng
  -> lỗi của một sheet được cô lập, các sheet hợp lệ vẫn tiếp tục
```

Production files:

- `apps/desktop/src/lib/local-file-inspector.ts`
- `apps/desktop/src/lib/source-preflight.ts`
- `apps/desktop/src/lib/home-multisource-candidate-review.ts`
- `apps/desktop/src/components/home/WorkbookSheetSelector.tsx`
- `apps/desktop/src/components/home/HomeWorkspaceView.tsx`
- `apps/desktop/src/pages/Home.tsx`

Invariants:

- Manifest không chạy semantic/grain sâu cho mọi sheet.
- Full workbook không có nghĩa là append/union mù; từng sheet giữ provenance,
  fingerprint, source identity và runtime bytes riêng.
- Một sheet lỗi phải trả `profile_error`/lý do cụ thể, không throw làm mất các
  sheet còn lại.
- Không làm yếu grain/readiness guard để ép một layout phức tạp thành dữ liệu
  giao dịch.

## Kiểm chứng trên workbook vận hành thật

File: `Ton kho vat tu 022025.xlsx`, gồm 6 sheet.

- `Tổng hợp`: nhận đúng header sau các dòng tiêu đề, 331 dòng dữ liệu và 9 cột;
  nhận diện được Tên vật tư, MVT, ĐVT, Đầu kỳ, Nhập, Xuất, Cuối kỳ.
- `02 Nhập` và `02 Xuất`: header nhiều tầng rất phức tạp; hiện được cô lập an
  toàn nếu grain/profile sâu không đạt, không kéo sập toàn workbook.
- Hai sheet sơ đồ kho: được nhận diện/cảnh báo là layout trình bày.
- `Sheet1`: sparse/scratch và giữ cảnh báo phù hợp.

Đã kiểm tra trực tiếp trên web: selector hiển thị đủ 6 sheet; chọn `Tổng hợp`
đưa vào canonical flow, tạo các góc nhìn tồn kho phù hợp; chế độ toàn workbook
giữ các nguồn hợp lệ và liệt kê rõ sheet bị bỏ qua. Không được tuyên bố các
sheet header nhiều tầng đã được flatten đầy đủ — đó là nâng cấp parser riêng
sau này, không phải lý do để hạ guard hiện tại.

## Semantic, BA và Dashboard

- Registry chung bổ sung alias vật tư/MVT/ĐVT và các lượng đầu kỳ, nhập, xuất,
  cuối kỳ; ontology dùng `quantity.received` và `quantity.issued` hiện hữu.
- BA inventory dùng các binding đã chọn và các alias chung; không phụ thuộc tên
  workbook mẫu.
- Dashboard dedupe theo hình dạng bằng chứng dimension + measure, không theo
  tiêu đề hiển thị.
- `DashboardChartWidget` chỉ format timestamp có miền thời gian hợp lệ; category
  số thông thường giữ nguyên số.
- Trạng thái Home không còn ghi “Unsupported” khi capability ladder đã có action
  universal có thể chạy.

Production files:

- `apps/desktop/src/lib/semantic-registry.ts`
- `apps/desktop/src/lib/understanding-core/ontology.ts`
- `apps/desktop/src/lib/understanding-core/question-engine.ts`
- `apps/desktop/src/lib/single-source-ba-overview.ts`
- `apps/desktop/src/lib/dashboard-evidence-dedup.ts`
- `apps/desktop/src/pages/Investigation.tsx`
- `apps/desktop/src/components/dashboards/DashboardChartWidget.tsx`

## Bằng chứng kiểm thử

- Focused import + dashboard: 14/14 pass.
- Semantic/BA/perspective/import/dashboard regression: 48/48 pass.
- i18n/language coverage: 11/11 pass.
- TypeScript check: pass.
- Vite production build: pass; chỉ còn cảnh báo chunk/Tailwind đã có trước.
- Browser với file thật: pass, không có console error/warn sau reload sạch.
- Full desktop Vitest: 204 files, 1.352/1.352 tests pass. Trong lúc phát triển,
  audit có bắt được sai lệch `1194 -> 1209`; đối chứng với commit backup cho
  thấy nguyên nhân là chế độ giữ ô trống bị áp quá rộng. Bản cuối giữ hành vi
  cũ cho consumer legacy và chỉ dùng bề mặt giữ vị trí ở luồng chọn sheet, nên
  toàn bộ frozen candidate/grain corpus đã trở lại đúng baseline.
- Exact-header semantic correction có audit riêng tại
  `beta-inventory-workbook-semantic-support-audit.json`; các alias ngắn như
  `MVT`, `ĐVT`, `Nhập`, `Xuất` không tham gia token-containment.
- Kiểm tra lại sau refactor: TypeScript pass; Vite production build pass.
- Web VPS sau reload/build: render đầy đủ và không có console error.
- Không build Windows trong đợt này.

## Tiếp tục an toàn

1. Xác nhận branch, HEAD, backup ref và worktree trước khi sửa.
2. Reproduce bằng fixture tổng quát; không thêm nhánh theo tên file/sheet cụ thể.
3. Nếu cần hỗ trợ `02 Nhập`/`02 Xuất`, hãy xây parser header nhiều tầng có
   provenance và test riêng; không append chúng vào `Tổng hợp` theo phỏng đoán.
4. Giữ selected action contract xuyên BA, Phân tích sâu, Dashboard và export.
5. Chạy focused tests, full Vitest, TypeScript, Vite và browser flow bằng workbook
   thật trước khi push.
6. Tạo backup ref mới sau mỗi cột mốc ổn định và cập nhật log này.
