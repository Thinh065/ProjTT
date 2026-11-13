# Knowledge base ESH

Bot School dùng `sources/` làm tài liệu gốc, `chunks/` làm văn bản theo trang và `manifest.json` để kiểm tra phiên bản nguồn.

Các biểu phí PDF giữ số trang gốc. Sáu tài liệu DOCX có bản PDF tham chiếu dạng văn bản trong `reference-pdfs/`. Khi trích dẫn các tài liệu này, bot ghi rõ số trang thuộc bản PDF tham chiếu.

Sau khi thêm hoặc cập nhật tài liệu nguồn, chạy từ `ai/backend` bằng Python có các gói trong `scripts/knowledge-requirements.txt`.

```powershell
python scripts/buildKnowledgeReferences.py
```

Trước lần chạy đầu tiên, tải model embedding về máy.

```powershell
npm.cmd run prepare:embeddings
```

Backend dùng model đa ngôn ngữ từ Hugging Face trên CPU local để tìm tài liệu và so khớp câu hỏi. Việc này không gọi HF Inference API. `.cache/` chứa model và chỉ mục có thể tạo lại.

Gemini chỉ nhận câu hỏi, các lượt hội thoại gần nhất và những trang liên quan. Model được cấu hình qua `GEMINI_MODEL`. Bot kiểm tra đoạn trích của Gemini có thực sự nằm trong trang nguồn trước khi trả lời.

Cache câu trả lời nằm trong collection `eshanswercaches` của MongoDB. **Câu hỏi độc lập** (hỏi về trường, không dựa vào hội thoại trước) dùng **chung một cache cho mọi tài khoản**: ai hỏi "Trường ESH có những chương trình học nào?" trước thì người sau hỏi "ESH dạy những chương trình gì?" sẽ nhận lại câu trả lời đã lưu mà không gọi AI. Trước khi so khớp, backend bỏ lời chào/từ đệm ("Dạ cho em hỏi…", "…ạ?", "…vậy?"); hai câu được coi là tương đương khi điểm so khớp ≥ 0,84, cùng điều kiện lớp, năm, chương trình, chủ đề, phủ định, và các nguồn đã trích nằm trong 10 trang liên quan nhất. Mỗi cách hỏi mới trúng cache được ghi nhớ thêm để lần sau trúng ngay. Câu hỏi nối tiếp hội thoại ("Còn lớp đó thì sao?") dùng thêm ngữ cảnh làm khóa và vẫn cache riêng theo tài khoản. Các câu không có đủ nguồn và các lỗi API không được lưu vào cache.

Phiên bản tài liệu, prompt và model nằm trong khóa cache. Thay đổi các phần này khiến backend tìm câu trả lời mới. Các lần trúng cache trả nguyên câu trả lời và trích dẫn đã lưu, cùng số token API bằng 0. Các câu hỏi tương đương gửi cùng lúc (cùng tài khoản, hoặc cùng nhóm câu hỏi dùng chung) được xếp hàng trong tiến trình backend để chỉ gọi AI một lần.

Tên tài liệu và số trang không lặp lại trong nội dung trả lời; giao diện hiện chúng ở mục **Nguồn thông tin** dưới mỗi câu trả lời. Gemini phải trích nguyên văn từ trang nguồn (cho phép khác biệt định dạng như Markdown, kiểu ngoặc kép, dấu "…" rút gọn); trích sai chữ thì câu trả lời bị từ chối.

Đồng bộ Chroma Cloud chỉ chạy khi chủ động đặt `CHROMA_SYNC_ON_START=true`. Bot School dùng knowledge base local và không cần đồng bộ Chroma.

Kiểm tra quy tắc nguồn và cache local.

```powershell
npm.cmd run test:knowledge
```
