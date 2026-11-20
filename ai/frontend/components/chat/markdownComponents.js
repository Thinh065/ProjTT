"use client"

import { useLayoutEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// Ô chỉ chứa số tiền / tỷ lệ (có thể kèm đơn vị và ký hiệu nguồn): "12.210.000 đ", "45,630,000 VNĐ", "60%"
const NUMERIC_CELL = /^[-+]?\d[\d.,\s]*(?:\s*(?:đ|₫|vnđ|vnd|%|triệu(?: đồng)?|đồng))?(?:\s*\[S\d+\])*$/i

// Bảng Markdown: tự căn phải cột số tiền (chữ số đều cột như bảng giá), căn giữa cột số ngắn;
// cột chữ giữ căn trái. Căn chỉnh ghi bằng data-align trên từng ô để cả tiêu đề cột cũng thẳng hàng.
function MarkdownTable({ node, className, ...props }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const table = ref.current
    if (!table) return
    const rows = [...table.rows]
    const bodyRows = rows.filter((row) => row.parentElement?.tagName === "TBODY")
    const columns = Math.max(0, ...rows.map((row) => row.cells.length))
    for (let column = 0; column < columns; column++) {
      const values = bodyRows.map((row) => row.cells[column]?.textContent.trim()).filter(Boolean)
      let align = "left"
      if (values.length && values.every((value) => NUMERIC_CELL.test(value))) {
        align = values.every((value) => value.replace(/\s*\[S\d+\]/g, "").length <= 3) ? "center" : "right"
      }
      for (const row of rows) row.cells[column]?.setAttribute("data-align", align)
    }
  })
  return (
    // Bảng co theo nội dung (khung ôm sát) và căn giữa khung trả lời, không kéo giãn khi chỉ có vài cột ngắn
    <div className="my-3 mx-auto w-fit max-w-full overflow-x-auto rounded-[12px] border border-[rgba(76,29,149,0.15)] bg-white shadow-[0_1px_2px_rgba(76,29,149,0.06)]">
      <table
        ref={ref}
        className={cn(
          "w-auto border-collapse text-[13px] leading-snug",
          "[&_[data-align=right]]:text-right [&_[data-align=right]]:tabular-nums [&_[data-align=right]]:whitespace-nowrap",
          "[&_[data-align=center]]:text-center [&_[data-align=center]]:tabular-nums",
          className
        )}
        {...props}
      />
    </div>
  )
}

// Kiểu hiển thị Markdown trong câu trả lời của bot (khung chat và trang Lịch sử).
// Dự án không dùng @tailwindcss/typography và Tailwind preflight xóa kiểu mặc định của danh sách,
// tiêu đề, bảng — nên định nghĩa rõ từng thẻ ở đây.
const markdownComponents = {
  p: ({ node, className, ...props }) => <p className={cn("my-2 first:mt-0 last:mb-0 leading-relaxed", className)} {...props} />,
  h1: ({ node, className, ...props }) => <h3 className={cn("mt-4 mb-2 first:mt-0 text-base font-bold text-[#1d1530]", className)} {...props} />,
  h2: ({ node, className, ...props }) => <h3 className={cn("mt-4 mb-2 first:mt-0 text-base font-bold text-[#1d1530]", className)} {...props} />,
  h3: ({ node, className, ...props }) => <h4 className={cn("mt-3 mb-1.5 first:mt-0 text-[15px] font-semibold text-[#4c1d95]", className)} {...props} />,
  h4: ({ node, className, ...props }) => <h5 className={cn("mt-3 mb-1 first:mt-0 text-sm font-semibold text-[#4c1d95]", className)} {...props} />,
  strong: ({ node, className, ...props }) => <strong className={cn("font-semibold text-[#1d1530]", className)} {...props} />,
  ul: ({ node, className, ...props }) => <ul className={cn("my-2 ml-5 list-disc space-y-1 marker:text-[#7c3aed]", className)} {...props} />,
  ol: ({ node, className, ...props }) => <ol className={cn("my-2 ml-5 list-decimal space-y-1 marker:text-[#7c3aed] marker:font-semibold", className)} {...props} />,
  li: ({ node, className, ...props }) => <li className={cn("pl-1 leading-relaxed [&>ul]:my-1 [&>ol]:my-1", className)} {...props} />,
  // Ghi chú / lưu ý ("> **Lưu ý:** ...")
  blockquote: ({ node, className, ...props }) => (
    <blockquote
      className={cn(
        "my-3 rounded-r-[10px] border-l-4 border-[#a78bfa] bg-[#f5f1ff] px-3 py-2 text-[#3b2f5c] [&>p]:my-1",
        className
      )}
      {...props}
    />
  ),
  hr: ({ node, className, ...props }) => <hr className={cn("my-3 border-[rgba(76,29,149,0.15)]", className)} {...props} />,
  a: ({ node, className, ...props }) => (
    <a className={cn("text-[#7c3aed] underline underline-offset-2 hover:text-[#6d28d9]", className)} target="_blank" rel="noreferrer" {...props} />
  ),
  // Bảng cuộn ngang trên màn hình hẹp thay vì tràn khung chat
  table: MarkdownTable,
  thead: ({ node, className, ...props }) => (
    <thead className={cn("bg-[#f1edff] text-[#4c1d95] border-b border-[rgba(76,29,149,0.15)]", className)} {...props} />
  ),
  tr: ({ node, className, ...props }) => (
    <tr className={cn("border-b border-[rgba(76,29,149,0.08)] last:border-0 [tbody>&:nth-child(even)]:bg-[#faf8ff]", className)} {...props} />
  ),
  // Bỏ căn lề ":---" do AI ghi trong Markdown (thường căn trái cả cột số); MarkdownTable tự căn theo nội dung
  th: ({ node, className, align, style, ...props }) => (
    <th className={cn("px-4 py-2 text-left text-[12.5px] font-semibold whitespace-nowrap", className)} {...props} />
  ),
  td: ({ node, className, align, style, ...props }) => (
    <td className={cn("px-4 py-1.5 align-middle text-[#2a2140] [&:first-child]:font-medium", className)} {...props} />
  ),
  pre: ({ node, className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto bg-[#1d1530] text-[#f1edff] rounded-[12px] p-3 my-2 text-xs font-mono border border-[rgba(76,29,149,0.2)] [&_code]:bg-transparent [&_code]:text-inherit [&_code]:p-0 [&_code]:border-0 [&_code]:rounded-none [&_code]:text-xs",
        className
      )}
      style={{ maxWidth: "100%" }}
      {...props}
    />
  ),
  code: ({ node, className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-") || String(children ?? "").includes("\n"))
    return (
      <code
        className={
          isBlock
            ? cn("font-mono text-xs", className)
            : cn(
                "bg-[#f1edff] text-[#4c1d95] rounded px-1.5 py-0.5 font-mono text-[90%] border border-[rgba(76,29,149,0.12)]",
                className
              )
        }
        {...props}
      >
        {children}
      </code>
    )
  },
}

export default markdownComponents
