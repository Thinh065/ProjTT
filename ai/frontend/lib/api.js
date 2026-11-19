export const API_BACKEND = (process.env.NEXT_PUBLIC_API_BACKEND || "http://localhost:5000").replace(
  /\/$/,
  ""
)

export function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function getStoredUser() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")
  } catch {
    return {}
  }
}

export function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  localStorage.removeItem("currentChat")
  localStorage.removeItem("currentChatId")
  localStorage.removeItem("currentBotId")
  if (window.location.pathname !== "/auth/login") window.location.href = "/auth/login"
}

/**
 * Gọi API backend kèm token. Trả về { ok, status, data }.
 * Tự đăng xuất khi token hết hạn (401) hoặc tài khoản bị khóa (403 từ middleware).
 */
export async function apiFetch(path, { method = "GET", body, headers = {}, signal, auth = true } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  const token = auth ? getToken() : null

  let res
  try {
    res = await fetch(`${API_BACKEND}${path}`, {
      method,
      headers: {
        ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal,
    })
  } catch (err) {
    if (err?.name === "AbortError") throw err
    return { ok: false, status: 0, data: { message: "Không kết nối được tới server" } }
  }

  const data = await res.json().catch(() => ({}))

  if (auth && token && (res.status === 401 || (res.status === 403 && data?.message === "Tài khoản đã bị khóa"))) {
    logout()
  }
  return { ok: res.ok, status: res.status, data }
}

/**
 * Gọi API trả Server-Sent Events (vd. /api/chatbot/stream). onEvent nhận từng object
 * {type:"delta"|"done"|"error", ...}. Lỗi trước khi mở stream (400/401/404/429) được đổi
 * thành một sự kiện error. Trả về sự kiện cuối cùng (done hoặc error).
 */
export async function apiStream(path, body, { signal, onEvent = () => {} } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BACKEND}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === "AbortError") throw err
    const event = { type: "error", status: 0, message: "Không kết nối được tới server" }
    onEvent(event)
    return event
  }

  if (!res.ok || !res.body || !(res.headers.get("content-type") || "").includes("event-stream")) {
    const data = await res.json().catch(() => ({}))
    if (token && (res.status === 401 || (res.status === 403 && data?.message === "Tài khoản đã bị khóa"))) logout()
    const event = { type: "error", status: res.status, message: data?.message || `Lỗi server (${res.status})` }
    onEvent(event)
    return event
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let last = null

  const processEventBlock = (part) => {
    const dataLines = part.split(/\r?\n/).filter((l) => l.startsWith("data:"))
    if (!dataLines.length) return // bỏ dòng ": ping" hoặc block rỗng
    const payload = dataLines.map((l) => l.slice(5).trimStart()).join("\n")
    if (!payload) return
    let event
    try {
      event = JSON.parse(payload)
    } catch {
      return
    }
    if (event.type !== "delta") last = event
    onEvent(event)
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      buffer += decoder.decode(value)
      for (const part of buffer.split(/\r?\n\r?\n/)) {
        if (part.trim()) processEventBlock(part)
      }
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split(/\r?\n\r?\n/)
    buffer = parts.pop() || ""
    for (const part of parts) {
      processEventBlock(part)
    }
  }
  if (!last && signal?.aborted) {
    const err = new Error("Aborted")
    err.name = "AbortError"
    throw err
  }
  return last || { type: "error", status: 0, message: "Kết nối bị ngắt giữa chừng" }
}
