"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bricolage_Grotesque } from "next/font/google"
import Aurora from "@/components/landing/Aurora"
import OwlHead from "@/components/landing/OwlHead"
import "@/components/landing/landing.css"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
})

/* ---------- Nội dung minh hoạ cho khung chat ở đầu trang ---------- */

const HERO_QUESTION = "Học bổng Einstein của ESH dành cho lớp nào?"

const HERO_BOTS = [
  {
    id: "esh",
    name: "Tư vấn ESH",
    via: "RAG · Gemini",
    answer:
      "Học bổng Tài năng Einstein dành cho học sinh từ lớp 2 đến lớp 12, hỗ trợ tới 100% học phí. Phụ huynh có thể đăng ký tư vấn để biết lịch xét học bổng năm nay.",
    sources: [
      "Tuyển sinh & học phí: Học bổng Tài năng Einstein, lên tới 100% học phí (lớp 2–12).",
      "Quy trình tuyển sinh 6 bước, từ tư vấn đến kiểm tra đầu vào và nhập học.",
    ],
    tokens: { input: 371, output: 41 },
  },
  {
    id: "deepseek",
    name: "DeepSeek R1",
    via: "OpenRouter",
    answer:
      "Mình không có thông tin chính thức về học bổng của trường ESH. Bạn nên xem website hoặc liên hệ phòng tuyển sinh của trường để biết điều kiện chính xác.",
    sources: [],
    tokens: { input: 23, output: 52 },
  },
  {
    id: "gpt",
    name: "GPT-4o mini",
    via: "GitHub Models",
    answer:
      "Mình chưa có dữ liệu về học bổng Einstein của ESH nên không dám đoán. Bạn thử hỏi bot Tư vấn ESH ngay trong ứng dụng này.",
    sources: [],
    tokens: { input: 23, output: 44 },
  },
]

/* ---------- Ô "thử gõ một câu hỏi" ---------- */

const ESH_WORDS = /(tuyển sinh|học phí|học bổng|nhập học|hồ sơ|\besh\b|lớp \d|xe đưa|bán trú|giáo viên|chương trình học|đầu vào)/i
const EXAMPLES = [
  "Hồ sơ nhập học lớp 6 cần gì?",
  "Viết hàm đảo chuỗi bằng Python",
  "Tóm tắt giúp mình bài báo này",
]
// Cùng quy tắc đặt tên cuộc trò chuyện như trong ứng dụng
const chatTitle = (text) => (text.length > 50 ? text.substring(0, 50) + "..." : text)

/* ---------- Các tính năng có công tắc ---------- */

const FEATURES = [
  { text: "Lưu lại mọi cuộc trò chuyện", detail: "Mở lại trên máy khác, đổi tên, xoá hoặc tải về JSON.", on: true },
  { text: "Đếm token cho từng tin nhắn", detail: "Ví dụ: câu hỏi 371 token, câu trả lời 41 token, tổng 412.", on: true },
  { text: "Hiện nguồn khi bot ESH trả lời", detail: "Mỗi câu trả lời kèm tối đa 10 đoạn tài liệu tuyển sinh đã dùng.", on: false },
  { text: "Giữ API key ở phía máy chủ", detail: "Trình duyệt chỉ gửi mã bot, key không bao giờ rời server.", on: false },
  { text: "Khoá tài khoản có hiệu lực ngay", detail: "Người bị khoá bị đăng xuất ở yêu cầu kế tiếp, không đợi token hết hạn.", on: false },
]

const STEPS = [
  { title: "Đăng ký bằng email của bạn.", detail: "Không cần thẻ, không cần tự mua API key." },
  { title: "Rồi chọn một bot ở cột trái.", detail: "Mỗi bot giữ lịch sử riêng, đổi qua lại không mất gì." },
  { title: "Gửi câu hỏi, mọi thứ tự lưu.", detail: "Mở lại ở trang Lịch sử, đổi tên, xoá hoặc tải về." },
]

const FAQ = [
  {
    q: "Dùng có mất phí không?",
    a: "Ứng dụng không thu phí người dùng. Chi phí gọi model do quản trị viên trả qua API key, và nhiều model trên OpenRouter miễn phí.",
  },
  {
    q: "Bot Tư vấn ESH lấy thông tin từ đâu?",
    a: "Từ bộ tài liệu tuyển sinh được nạp sẵn. Bot tìm đoạn liên quan nhất rồi mới trả lời, và nói thẳng khi tài liệu không nhắc tới.",
  },
  {
    q: "Ai xem được lịch sử chat của tôi?",
    a: "Chỉ bạn, và quản trị viên của hệ thống khi cần hỗ trợ. Người dùng khác không xem được.",
  },
  {
    q: "Token là gì, sao phải đếm?",
    a: "Token là đơn vị chữ mà model dùng để tính phí. Thấy số token từng tin, bạn biết câu nào tốn và nên viết gọn ở đâu.",
  },
  {
    q: "Quên mật khẩu thì làm sao?",
    a: "Liên hệ quản trị viên. Họ đặt cho bạn một mật khẩu tạm, bạn đăng nhập rồi đổi lại trong trang Hồ sơ.",
  },
  {
    q: "Có thêm được model khác không?",
    a: "Có. Quản trị viên thêm bất kỳ API tương thích OpenAI, chỉ cần tên, Base URL, model và key.",
  },
]

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/* ======================================================================= */

export default function LandingPage() {
  const rootRef = useRef(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    try {
      setLoggedIn(!!localStorage.getItem("token"))
    } catch {}
  }, [])

  // Mắt robot mở dần khi cuộn xuống (0 → 1 trong 260px đầu)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (prefersReducedMotion()) {
      root.style.setProperty("--eyes-open", "1")
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const open = Math.min(1, Math.max(0, window.scrollY / 260))
      root.style.setProperty("--eyes-open", (0.06 + open * 0.94).toFixed(3))
      root.classList.toggle("lp-awake", open >= 1)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Hiện dần từng phần khi section vào màn hình
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add("lp-js")
    const items = root.querySelectorAll("[data-reveal]")
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in")
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={`lp ${bricolage.className}`}>
      <main>
        <div className="lp-top">
          <Aurora />
          <Nav loggedIn={loggedIn} />
          <Hero loggedIn={loggedIn} />
        </div>
        <Showcase />
        <Features />
        <HowItWorks />
        <Admin />
        <Faq />
        <Cta />
      </main>
      <Footer loggedIn={loggedIn} />
    </div>
  )
}

/* ---------- Thanh điều hướng ---------- */

function Nav({ loggedIn }) {
  return (
    <header className="lp-nav lp-wrap">
      <Link href="/" className="lp-wordmark">
        ProjTT
      </Link>
      <nav aria-label="Chính">
        <a href="#thu">Thử hỏi</a>
        <a href="#tinh-nang">Tính năng</a>
        <a href="#cach-dung">Cách dùng</a>
        <a href="#quan-tri">Quản trị</a>
        <a href="#hoi-dap">Hỏi đáp</a>
        {loggedIn ? (
          <Link href="/dashboard" className="lp-nav-action">
            Vào khung chat
          </Link>
        ) : (
          <Link href="/auth/login" className="lp-nav-action">
            Đăng nhập
          </Link>
        )}
      </nav>
    </header>
  )
}

/* ---------- Đầu trang: khung chat chạy thật với dữ liệu minh hoạ ---------- */

function Hero({ loggedIn }) {
  const [botId, setBotId] = useState("esh")
  const [shown, setShown] = useState(HERO_BOTS[0].answer.length)
  const bot = HERO_BOTS.find((b) => b.id === botId)

  // Gõ dần câu trả lời mỗi khi đổi bot
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(bot.answer.length)
      return
    }
    setShown(0)
    let n = 0
    const id = setInterval(() => {
      n += 3
      setShown(Math.min(n, bot.answer.length))
      if (n >= bot.answer.length) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [bot])

  const done = shown >= bot.answer.length
  const total = bot.tokens.input + bot.tokens.output

  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-wrap lp-hero-copy">
        <h1 id="hero-title" className="lp-display">
          Mọi AI trong
          <br />
          một khung chat
        </h1>
        <p className="lp-lead">
          Hỏi DeepSeek, GPT-4o hay bot tư vấn tuyển sinh ESH trong cùng một cửa sổ. Lịch sử được lưu lại, token được đếm
          từng tin.
        </p>
        <Link href={loggedIn ? "/dashboard" : "/auth/register"} className="lp-btn">
          {loggedIn ? "Vào khung chat" : "Tạo tài khoản"}
        </Link>
      </div>

      <OwlHead size={300} className="lp-mascot" label="Cú linh vật của ProjTT, mở mắt khi bạn cuộn xuống" />
      <div className="lp-stage">
        <div className="lp-chat" data-ui>
          <div className="lp-chat-bar" role="radiogroup" aria-label="Chọn bot để xem câu trả lời">
            {HERO_BOTS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={b.id === botId}
                className="lp-chip"
                onClick={() => setBotId(b.id)}
              >
                <span className="lp-chip-name">{b.name}</span>
                <span className="lp-chip-via">{b.via}</span>
              </button>
            ))}
          </div>

          <div className="lp-chat-body">
            <div className="lp-msg lp-msg-user">{HERO_QUESTION}</div>
            <div className="lp-msg-row">
              <OwlHead size={32} className="lp-avatar" sleepy={false} />
              <div className="lp-msg lp-msg-ai" aria-live="polite">
                <p>
                  {bot.answer.slice(0, shown)}
                  {!done && <span className="lp-caret" aria-hidden="true" />}
                </p>
                {done && bot.sources.length > 0 && (
                  <details className="lp-sources" open>
                    <summary>Nguồn thông tin ({bot.sources.length})</summary>
                    <ul>
                      {bot.sources.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>

          <div className="lp-chat-foot">
            <span>
              {total} tokens · hỏi {bot.tokens.input} · đáp {bot.tokens.output}
            </span>
            <span>Đã lưu vào lịch sử</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Ô tiêu đề gõ được ---------- */

function Showcase() {
  const [text, setText] = useState("Học phí lớp 10 bao nhiêu?")
  const clean = text.trim()
  const isEsh = ESH_WORDS.test(clean)
  const tokens = clean ? Math.max(1, Math.ceil(clean.length / 3.5)) : 0

  return (
    <section id="thu" className="lp-show lp-wrap" aria-labelledby="show-title">
      <h2 id="show-title" className="lp-head" data-reveal>
        Thử gõ một câu hỏi
      </h2>
      <div className="lp-type" data-ui data-reveal style={{ "--i": 1 }}>
        <label htmlFor="try-input" className="lp-sr">
          Câu hỏi của bạn
        </label>
        <input
          id="try-input"
          className="lp-type-input lp-display"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <dl className="lp-answer" data-ui data-reveal style={{ "--i": 2 }} aria-live="polite">
        <div>
          <dt>Bot nên hỏi</dt>
          <dd>
            {clean ? (isEsh ? "Tư vấn ESH, có trích nguồn tài liệu" : "Một bot đa năng như DeepSeek R1 hoặc GPT-4o mini") : "Hãy gõ một câu"}
          </dd>
        </div>
        <div>
          <dt>Tên trong lịch sử</dt>
          <dd>{clean ? chatTitle(clean) : "Cuộc trò chuyện mới"}</dd>
        </div>
        <div>
          <dt>Token cho câu hỏi, ước tính</dt>
          <dd>{tokens}</dd>
        </div>
      </dl>

      <div className="lp-examples" data-reveal style={{ "--i": 3 }}>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </section>
  )
}

/* ---------- Các câu có công tắc ---------- */

function Features() {
  const [on, setOn] = useState(FEATURES.map((f) => f.on))
  const toggle = (i) => setOn((prev) => prev.map((v, j) => (j === i ? !v : v)))

  return (
    <section id="tinh-nang" className="lp-features" aria-labelledby="feat-title">
      <div className="lp-wrap">
        <h2 id="feat-title" className="lp-head" data-reveal>
          Bật sẵn cho bạn
        </h2>
      </div>
      {FEATURES.map((f, i) => (
        <div key={f.text} className={`lp-band ${on[i] ? "is-on" : ""}`} data-tone={i % 2 ? "soot" : "lime"}>
          <div className="lp-wrap lp-band-inner" data-reveal style={{ "--i": i % 3 }}>
            <p className="lp-band-text">{f.text}</p>
            <p className="lp-band-detail">{f.detail}</p>
            <button
              type="button"
              role="switch"
              aria-checked={on[i]}
              aria-label={f.text}
              className="lp-switch"
              data-ui
              onClick={() => toggle(i)}
            >
              <span />
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ---------- Ba bước, khung giao diện ghim lại ---------- */

function HowItWorks() {
  const [active, setActive] = useState(0)
  const stepRefs = useRef([])

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    )
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section id="cach-dung" className="lp-how lp-wrap" aria-labelledby="how-title">
      <h2 id="how-title" className="lp-head lp-how-title">
        Ba bước để hỏi
      </h2>
      <div className="lp-how-steps">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => (stepRefs.current[i] = el)}
            data-step={i}
            className={`lp-step ${active === i ? "is-active" : ""}`}
          >
            <p className="lp-step-title">{s.title}</p>
            <p className="lp-step-detail">{s.detail}</p>
          </div>
        ))}
      </div>

      <div className="lp-how-stage">
        <img
          src="/landing/steps.jpg"
          alt="Cầu thang trắng nhìn qua một khe tường"
          width="1200"
          height="1200"
          loading="lazy"
          className="lp-how-photo"
        />
        <div className="lp-panel" data-ui data-state={active}>
          {active === 0 && (
            <form className="lp-form" onSubmit={(e) => e.preventDefault()} aria-label="Ví dụ form đăng ký">
              <p className="lp-panel-title">Tạo tài khoản</p>
              <label>
                Họ tên
                <input readOnly value="Minh Anh" tabIndex={-1} />
              </label>
              <label>
                Email
                <input readOnly value="minhanh@gmail.com" tabIndex={-1} />
              </label>
              <label>
                Mật khẩu
                <input readOnly type="password" value="••••••••" tabIndex={-1} />
              </label>
              <span className="lp-form-btn">Đăng ký</span>
            </form>
          )}
          {active === 1 && (
            <div className="lp-botlist">
              <p className="lp-panel-title">ChatBot AI</p>
              {HERO_BOTS.map((b, i) => (
                <div key={b.id} className={`lp-botrow ${i === 0 ? "is-selected" : ""}`}>
                  <OwlHead size={28} className="lp-avatar" sleepy={false} />
                  <div>
                    <strong>{b.name}</strong>
                    <span>{b.via}</span>
                  </div>
                </div>
              ))}
              <p className="lp-panel-note">3 cuộc trò chuyện với Tư vấn ESH</p>
            </div>
          )}
          {active === 2 && (
            <div className="lp-minichat">
              <p className="lp-panel-title">Tư vấn ESH · Học bổng Einstein</p>
              <div className="lp-msg lp-msg-user">{HERO_QUESTION}</div>
              <div className="lp-msg lp-msg-ai">
                <p>{HERO_BOTS[0].answer}</p>
              </div>
              <p className="lp-saved">Đã lưu · 412 tokens</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- Dành cho quản trị viên ---------- */

const ADMIN_USERS = [
  { name: "Minh Anh", email: "minhanh@gmail.com", tokens: 18420, chats: 12, status: "active" },
  { name: "Quốc Bảo", email: "baoq@gmail.com", tokens: 9310, chats: 7, status: "active" },
  { name: "Thu Hà", email: "thuha.le@gmail.com", tokens: 2050, chats: 2, status: "blocked" },
]
const ADMIN_BOTS = [
  { name: "DeepSeek R1", model: "deepseek/deepseek-r1-0528:free", key: "sk-o…9c2f", hidden: false },
  { name: "GPT-4o mini", model: "openai/gpt-4o-mini", key: "ghp_…Qx7a", hidden: false },
  { name: "Llama 3.3 70B", model: "meta-llama/llama-3.3-70b-instruct", key: "sk-o…41d0", hidden: true },
]

function Admin() {
  const [selected, setSelected] = useState(0)
  return (
    <section id="quan-tri" className="lp-admin lp-wrap" aria-labelledby="admin-title">
      <div className="lp-admin-copy" data-reveal>
        <h2 id="admin-title" className="lp-head">
          Quản trị viên thấy hết
        </h2>
        <p className="lp-admin-text">
          Ai đang dùng bao nhiêu token, ai cần khoá, bot nào nên tạm ẩn. Bấm vào một người để mở lại lịch sử chat của họ.
        </p>
      </div>

      <div className="lp-admin-frags">
        <table className="lp-table" data-ui data-reveal style={{ "--i": 1 }}>
          <caption className="lp-sr">Ví dụ bảng người dùng trong trang quản trị</caption>
          <thead>
            <tr>
              <th scope="col">Người dùng</th>
              <th scope="col">Tokens</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_USERS.map((u, i) => (
              <tr
                key={u.email}
                className={selected === i ? "is-selected" : ""}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(i))}
                tabIndex={0}
                aria-selected={selected === i}
              >
                <td>
                  <strong>{u.name}</strong>
                  <span>{u.email}</span>
                </td>
                <td>
                  <strong>{u.tokens.toLocaleString("vi-VN")}</strong>
                  <span>{u.chats} cuộc trò chuyện</span>
                </td>
                <td>
                  <span className={`lp-badge ${u.status === "blocked" ? "is-blocked" : ""}`}>
                    {u.status === "blocked" ? "Bị chặn" : "Hoạt động"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lp-admin-pick" aria-live="polite">
          Đang xem lịch sử của {ADMIN_USERS[selected].name}: {ADMIN_USERS[selected].chats} cuộc trò chuyện,{" "}
          {ADMIN_USERS[selected].tokens.toLocaleString("vi-VN")} tokens.
        </p>

        <ul className="lp-botkeys" data-ui data-reveal style={{ "--i": 2 }} aria-label="Ví dụ danh sách ChatBot">
          {ADMIN_BOTS.map((b) => (
            <li key={b.name}>
              <div>
                <strong>{b.name}</strong>
                <span>{b.model}</span>
              </div>
              <code>{b.key}</code>
              <span className={`lp-badge ${b.hidden ? "is-blocked" : ""}`}>{b.hidden ? "Tạm ẩn" : "Hiện"}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Hỏi đáp ---------- */

function Faq() {
  const [sel, setSel] = useState(0)
  return (
    <section id="hoi-dap" className="lp-faq lp-wrap" aria-labelledby="faq-title">
      <div className="lp-faq-list">
        <h2 id="faq-title" className="lp-head">
          Hỏi đáp nhanh
        </h2>
        <ul>
          {FAQ.map((item, i) => (
            <li key={item.q}>
              <button
                type="button"
                aria-expanded={sel === i}
                aria-controls={`faq-a-${i}`}
                className={sel === i ? "is-sel" : ""}
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
              >
                {item.q}
              </button>
              {/* trên điện thoại câu trả lời mở ngay dưới câu hỏi */}
              <p id={`faq-a-${i}`} className="lp-faq-inline" hidden={sel !== i}>
                {item.a}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-faq-pane" aria-hidden="true">
        <p key={sel} className="lp-faq-answer">
          {FAQ[sel].a}
        </p>
      </div>
    </section>
  )
}

/* ---------- Kêu gọi đăng ký ---------- */

function Cta() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const submit = (e) => {
    e.preventDefault()
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""
    router.push(`/auth/register${q}`)
  }
  return (
    <section className="lp-cta lp-wrap" aria-labelledby="cta-title">
      <Aurora intensity={1.1} calm={[0.3, 0.5]} />
      <form onSubmit={submit} data-reveal>
        <h2 id="cta-title" className="lp-display">
          Bắt đầu với email
        </h2>
        <div className="lp-cta-row lp-display">
          <label htmlFor="cta-email" className="lp-sr">
            Email của bạn
          </label>
          <input
            id="cta-email"
            type="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button type="submit">Đăng ký</button>
        </div>
        <p className="lp-cta-note">Bạn sẽ sang trang đăng ký với email đã điền sẵn, đặt mật khẩu là dùng được.</p>
      </form>
    </section>
  )
}

/* ---------- Chân trang dạng ô ---------- */

function Clock() {
  const [now, setNow] = useState("")
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
    setNow(fmt())
    const id = setInterval(() => setNow(fmt()), 15000)
    return () => clearInterval(id)
  }, [])
  return <span className="lp-tile-big">{now || "--:--"}</span>
}

function Footer({ loggedIn }) {
  return (
    <footer className="lp-footer">
      <div className="lp-tiles">
        <div className="lp-tile lp-tile-statement">
          <p>Một khung chat cho mọi mô hình AI, và một cô giáo tuyển sinh luôn trực.</p>
          <small>
            © 2026 ProjTT. Đồ án thực tập. Ảnh cầu thang: Todd Quackenbush,{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
              giấy phép Unsplash
            </a>
            .
          </small>
        </div>
        <nav className="lp-tile lp-tile-nav" aria-label="Chân trang">
          <a href="#thu">Thử hỏi</a>
          <a href="#tinh-nang">Tính năng</a>
          <a href="#cach-dung">Cách dùng</a>
          <a href="#hoi-dap">Hỏi đáp</a>
        </nav>
        <div className="lp-tile lp-tile-time">
          <span>Giờ Việt Nam</span>
          <Clock />
        </div>
        <div className="lp-tile lp-tile-mail">
          <span>Mã nguồn</span>
          <a href="https://github.com/Thinh065/ProjTT" target="_blank" rel="noreferrer">
            Thinh065/ProjTT trên GitHub
          </a>
        </div>
        <div className="lp-tile lp-tile-word" aria-hidden="true">
          ProjTT
        </div>
        <Link href={loggedIn ? "/dashboard" : "/auth/login"} className="lp-tile lp-tile-go">
          <span>{loggedIn ? "Vào khung chat" : "Đăng nhập để hỏi"}</span>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <path d="M12 44 L44 12 M20 12 H44 V36" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </Link>
      </div>
    </footer>
  )
}
