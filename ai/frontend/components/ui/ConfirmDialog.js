import { useState } from "react"

export function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [onConfirm, setOnConfirm] = useState(null)
  const [onlyClose, setOnlyClose] = useState(false)

  const show = ({ message, onConfirm, onlyClose = false }) => {
    setMessage(message)
    setOnConfirm(() => onConfirm)
    setOnlyClose(onlyClose)
    setOpen(true)
  }

  // Component ConfirmDialog
  const ConfirmDialog = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1530]/40 backdrop-blur-xs p-4">
      <div className="bg-[rgba(255,255,255,0.96)] backdrop-blur-md border border-[rgba(76,29,149,0.12)] rounded-[18px] shadow-[0_12px_32px_-18px_rgba(76,29,149,0.22)] p-6 min-w-[280px] max-w-[90vw] sm:max-w-md w-full text-[#1d1530]">
        <div className="mb-5 text-base font-medium text-[#1d1530] leading-relaxed">{message}</div>
        <div className="flex justify-end gap-2">
          {!onlyClose && (
            <button
              className="px-4 py-2 bg-[#be123c] text-white text-sm font-medium rounded-[11px] hover:bg-[#9f1239] transition shadow-xs"
              onClick={() => {
                setOpen(false)
                if (onConfirm) onConfirm()
              }}
            >
              Xác nhận
            </button>
          )}
          <button
            className="px-5 py-2 bg-[#f1edff] text-[#1d1530] text-sm font-medium rounded-[11px] border border-[rgba(76,29,149,0.12)] hover:bg-[#e4dcff] transition"
            onClick={() => {
              setOpen(false)
              // Với hộp thông báo chỉ có nút Đóng, onConfirm chạy khi đóng
              if (onlyClose && onConfirm) onConfirm()
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  ) : null

  return [ConfirmDialog, show]
}