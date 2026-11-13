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
