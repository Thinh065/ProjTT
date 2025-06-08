import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Multi ChatBot AI",
  description: "Tích hợp nhiều ChatBot AI trong một nền tảng",
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
