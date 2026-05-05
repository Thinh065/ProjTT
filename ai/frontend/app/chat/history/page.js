"use client"
import { useEffect, useState } from "react";
import ChatHistory from "@/components/chat/ChatHistory";

export default function ChatHistoryPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/chat/history", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setChats(data.chats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Đang tải lịch sử...</div>;

  return (
    <ChatHistory
      selectedBot={null}
      chats={chats}
      // ...other props nếu cần
    />
  );
}