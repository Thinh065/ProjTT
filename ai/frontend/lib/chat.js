// Câu trả lời cũ của bot ESH có khối "**Nguồn tham khảo**" ở cuối; nay nguồn chỉ hiện trong mục
// "Nguồn thông tin" (sourceChunks), nên bỏ khối đó khi hiển thị/gửi lại các tin đã lưu từ trước.
export function messageText(message) {
  const content = String(message?.content ?? "")
  if (message?.role !== "assistant") return content
  return content.replace(/\n*\*\*Nguồn tham khảo\*\*\n[\s\S]*$/, "")
}

// AI hay viết "> **Lưu ý:**" rồi các dòng "- …" không có dấu ">" — theo Markdown các ý đó rơi ra ngoài
// khung ghi chú. Khi hiển thị, nối các dòng liền ngay sau (chưa gặp dòng trống, tiêu đề hay bảng) vào khung.
export function displayMarkdown(text) {
  let inQuote = false
  return String(text ?? "")
    .split("\n")
    .map((line) => {
      if (/^\s*>/.test(line)) {
        inQuote = true
        return line
      }
      if (inQuote && line.trim() && !/^\s*(?:#|\|)/.test(line)) return `> ${line}`
      inQuote = false
      return line
    })
    .join("\n")
}
