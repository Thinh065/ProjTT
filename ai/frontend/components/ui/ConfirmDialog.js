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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 min-w-[320px]">
        <div className="mb-4 text-base">{message}</div>
        <div className="flex justify-end gap-2">
          {!onlyClose && (
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => {
                setOpen(false)
                if (onConfirm) onConfirm()
              }}
            >
              Xác nhận
            </button>
          )}
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  ) : null

  return [ConfirmDialog, show]
}