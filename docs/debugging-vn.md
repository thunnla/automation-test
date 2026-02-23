# Hướng dẫn debug test — Universal Test Engine (Tiếng Việt)

Mục tiêu: các bước cụ thể để điều tra và sửa lỗi test (API hoặc UI).

1) Xác định scope
- Lấy tên test / file spec hoặc tag ví dụ: `tests/ui/login.spec.ts` hoặc `@critical`.

2) Chạy lại test cục bộ (đơn test)
- Chạy chỉ test đó để nhanh chóng tái tạo lỗi:

```bash
npx playwright test tests/ui/login.spec.ts -g "Successful login"
```

- Nếu cần chạy trong trình duyệt có giao diện:

```bash
npx playwright test tests/ui/login.spec.ts -g "Successful login" --headed
```

3) Bật trace để xem chi tiết (UI)
- Kích hoạt trace cho một lần chạy:

```bash
npx playwright test tests/ui/login.spec.ts -g "Successful login" --trace=on
```

- Sau khi chạy xong, mở trace:

```bash
npx playwright show-trace test-results/<run-id>/trace.zip
```

4) Chụp màn hình & video
- Cấu hình môi trường (`config/environments/*.json`) có `features.video` và `features.screenshots`.
- Nếu bật `retain-on-failure`, video/ảnh sẽ được lưu tự động cho test fail.

5) Debugging API
- Chạy 1 test API và in/log request/response:

```bash
npx playwright test tests/api/users.spec.ts -g "GET /users" --project=api
```

- Mở HTML report → xem attachment `Request` / `Response` JSON.
- Nếu cần thêm logs, mở test và thêm `console.log()` hoặc attach JSON bằng `testInfo.attach()`.

6) Dò lỗi schema/response
- Nếu test dùng `bodySchema`, kiểm tra schema trong file JSON và kiểm tra `reports/results.json`.
- Dùng `src/utils/schema-validator.ts` để validate JSON test files.

7) Lập lại bằng Postman / curl
- Để tách lỗi test framework hay lỗi backend, tái tạo request bằng curl: copy URL, headers, body từ attachment.

```bash
curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d '{"name":"..."}'
```

8) Chạy sát giới hạn và boundary cases
- Dùng các test trong `tests/api/boundary-users.spec.ts` để kiểm thử edge cases.

9) Debug interactive
- Chạy Playwright Inspector:

```bash
npx playwright test --debug
```

- Khi chạy, chọn breakpoint, replay steps, inspect DOM state.

10) Ghi lại kết quả & next steps
- Lưu report HTML, screenshot, trace, và tóm tắt ngắn: môi trường, commit, bước tái tạo, log.
- Nếu cần tôi hỗ trợ triage: gửi tên spec, môi trường (`TEST_ENV`), và phần log/attachment quan trọng.

---

Nếu bạn muốn, tôi có thể **chạy một thử nghiệm debug cụ thể** trên máy của bạn (nếu bạn chỉ định `tests/...spec.ts` hoặc tên test).