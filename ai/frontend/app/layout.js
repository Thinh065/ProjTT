import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ProjTT · Mọi AI trong một khung chat",
  description: "Chat với nhiều mô hình AI và bot tư vấn tuyển sinh ESH trong một khung chat, có lưu lịch sử và đếm token.",
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
