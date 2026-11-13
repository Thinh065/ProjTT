// Câu trả lời cũ của bot ESH có khối "**Nguồn tham khảo**" ở cuối; nay nguồn chỉ hiện trong mục
// "Nguồn thông tin" (sourceChunks), nên bỏ khối đó khi hiển thị/gửi lại các tin đã lưu từ trước.
export function messageText(message) {
  const content = String(message?.content ?? "")
  if (message?.role !== "assistant") return content
  return content.replace(/\n*\*\*Nguồn tham khảo\*\*\n[\s\S]*$/, "")
}
