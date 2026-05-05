"use client"
import { useEffect, useState } from "react";
import ChatHistory from "@/components/chat/ChatHistory";

export default function ChatPage({ params }) {
  const [chats, setChats] = useState([]);
  const botId = params.id;

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/api/chat/history?botId=${botId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setChats(data.chats || []));
  }, [botId]);

  return (
    <ChatHistory
      selectedBot={{ id: botId }}
      chats={chats}
      // ...other props
    />
  );
}