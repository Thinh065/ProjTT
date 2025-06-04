"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatLayout({ children }) {
  const [history, setHistory] = useState([]);
  const router = useRouter();

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem("chatHistory") || "[]"));
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: 250, borderRight: "1px solid #eee" }}>
        <h3>Lịch sử trò chuyện</h3>
        {history.length === 0 && <div>Chưa có cuộc trò chuyện nào</div>}
        <ul>
          {history.map((chat) => (
            <li key={chat.id}>
              <button onClick={() => router.push(`/chat/${chat.id}`)}>
                {chat.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}