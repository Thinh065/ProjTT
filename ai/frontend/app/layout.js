import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Multi ChatBot AI",
  description: "Tích hợp nhiều ChatBot AI trong một nền tảng",
  generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen w-full">{children}</div>
      </body>
    </html>
  )
}
