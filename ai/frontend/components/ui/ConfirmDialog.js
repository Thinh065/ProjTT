import { useState } from "react"

export function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [onConfirm, setOnConfirm] = useState(null)
  const [onlyClose, setOnlyClose] = useState(false)

  const show = ({ message, onConfirm, onlyClose = false }) => {
    setMessage(message)
    setOnlyClose(onlyClose)
    if (onConfirm) {
      setOnConfirm(() => () => {
        setOpen(false)
        onConfirm()
      })
    } else {
      setOnConfirm(null)
    }
    setOpen(true)
  }

  const ConfirmDialog = open ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded shadow-lg p-6 min-w-[300px]">
        <h2 className="font-bold text-lg mb-2">Multi ChatBot AMC</h2>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setOpen(false)}>
            {onlyClose ? "Đóng" : "Huỷ"}
          </button>
          {!onlyClose && onConfirm && (
            <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={onConfirm}>Xác nhận</button>
          )}
        </div>
      </div>
    </div>
  ) : null

  return [ConfirmDialog, show]
}