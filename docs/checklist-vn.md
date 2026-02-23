# Checklist chạy test — Universal Test Engine (Tiếng Việt)

Mục tiêu: hướng dẫn QA engineer chạy, lọc và kiểm tra kết quả test nhanh chóng.

1) Chuẩn bị môi trường
- Cài Node.js ≥ 18 và npm.
- Tại thư mục project, chạy:

```bash
npm install
npx playwright install --with-deps
```

2) Thiết lập môi trường test
- Chỉnh `config/environments/<env>.json` (ví dụ: `staging.json`) để đặt `apiBaseUrl` và `uiBaseUrl`.
- Hoặc export biến môi trường:

PowerShell:
```powershell
$env:TEST_ENV='staging'
$env:API_BASE_URL='https://staging-api.example.com/api'
```

3) Chạy test cơ bản
- Chạy mọi test (mặc định `dev`):

```bash
npm test
```

- Chỉ chạy API hoặc UI:

```bash
npm run test:api
npm run test:ui
```

- Chạy theo tag:

```bash
npx playwright test --grep @smoke
npm run test:smoke
```

- Chạy spec/file cụ thể hoặc test theo tiêu đề:

```bash
npx playwright test tests/api/users.spec.ts
npx playwright test -g "Successful login"
```

4) Chạy ở chế độ tương tác / debug
- Headed (thấy trình duyệt):

```bash
npm run test:headed
```

- Debug (Playwright inspector):

```bash
npx playwright test --debug
```

5) Kết quả & báo cáo
- Mở báo cáo HTML:

```bash
npm run test:report
# hoặc
npx playwright show-report reports/html
```

- Tìm `reports/results.json` hoặc `reports/summary.json` để lấy tóm tắt CI.
- Ảnh chụp lỗi, trace và video (nếu bật) nằm trong `test-results/` và được đính kèm trong HTML report.

6) Snapshot (visual) – cập nhật baseline
- Nếu test visual fail do thay đổi giao diện hợp lệ, cập nhật snapshot:

```bash
npx playwright test --update-snapshots
```

7) Validate JSON test files
- Kiểm tra schema của các file JSON:

```bash
npx ts-node src/utils/schema-validator.ts
```

8) Chạy kiểm tra nhanh (smoke) trước deploy
- Trên CI hoặc local, chạy:

```bash
npx playwright test --grep @smoke --project=api
npx playwright test --grep @smoke --project=chromium
```

9) Ghi chú xử lý sự cố nhanh
- Nếu test API thất bại: kiểm tra `Request` / `Response` đính kèm trong report để xem header, body, status.
- Nếu UI thất bại: mở HTML report → xem screenshot và trace (nếu có) → chạy test bằng `--debug` để reproducer.
- Thử chạy test chỉ một file/one test để cô lập lỗi.

10) Liên hệ & ghi chép
- Ghi lỗi trong ticket kèm: steps, env, thời gian chạy, report JSON, screenshot, trace.

---

Nếu bạn muốn, tôi có thể chuyển checklist này vào `README.md` hoặc tạo phiên bản in/HTML nội bộ.