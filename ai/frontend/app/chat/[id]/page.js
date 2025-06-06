"use client"
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatDetailPage() {
  const { id } = useParams();
  const [chat, setChat] = useState(null);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    const found = history.find((c) => String(c.id) === String(id));
    setChat(found);
  }, [id]);

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Bạn có chắc muốn xóa người dùng này?")) {
      // ...xóa user...
    }
  }

  if (!chat) return <div>Không tìm thấy cuộc trò chuyện</div>;

  return (
    <div>
      <h2>{chat.title}</h2>
      <div>
        {chat.messages.map((msg, idx) => (
          <div key={idx} style={{ margin: "8px 0" }}>
            <b>{msg.role === "user" ? "Bạn" : "Bot"}:</b> {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}