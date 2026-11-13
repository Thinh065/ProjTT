"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bricolage_Grotesque } from "next/font/google"
import { Icon } from "@iconify/react"
import CyberFox from "@/components/landing/CyberFox"
import Magnetic from "@/components/landing/Magnetic"
import PixelCard from "@/components/landing/react-bits/PixelCard"
import SpotlightCard from "@/components/landing/react-bits/SpotlightCard"
import ClickSpark from "@/components/landing/react-bits/ClickSpark"
import ShinyText from "@/components/landing/react-bits/ShinyText"
import DecryptedText from "@/components/landing/react-bits/DecryptedText"
import CountUp from "@/components/landing/react-bits/CountUp"
import GradientText from "@/components/landing/react-bits/GradientText"
import GlareHover from "@/components/landing/react-bits/GlareHover"
import SquishSwitch from "@/components/landing/react-bits/SquishSwitch"
import BorderGlow from "@/components/landing/react-bits/BorderGlow"
import LatticeLoader from "@/components/landing/react-bits/LatticeLoader"
import RubberSegment from "@/components/landing/react-bits/RubberSegment"
import Counter from "@/components/landing/react-bits/Counter"
import BlurText from "@/components/landing/react-bits/BlurText"
import TechText from "@/components/landing/react-bits/TechText"
import "@/components/landing/landing.css"
import "@/components/landing/landing-light.css"
import LightBackdrop from "@/components/landing/LightBackdrop"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Bảng màu chủ đạo đồng bộ với nền Silk của React Bits (Trắng lụa - Tím Lavender - Tím Hoàng Gia - Lam Indigo)
const SILK_GRADIENT = ["#ffffff", "#ddd6fe", "#a78bfa", "#818cf8"]
const SILK_PIXEL_COLORS = ["#ddd6fe", "#a78bfa", "#6366f1"]

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

const ESH_WORDS =
  /(tuyển sinh|học phí|học bổng|nhập học|hồ sơ|\besh\b|einstein|lớp \d|xe đưa|bán trú|giáo viên|chương trình học|đầu vào)/i

const EXAMPLES = [
  {
    tag: "RAG · Tư vấn ESH",
    icon: "mdi:school-outline",
    prompt: "Hồ sơ nhập học lớp 6 cần gì?",
    reply:
      "Hồ sơ nhập học lớp 6 tại ESH gồm: Đơn đăng ký dự tuyển, học bạ tiểu học (bản sao công chứng), giấy khai sinh và 02 ảnh 3×4. Phụ huynh nộp trực tiếp tại văn phòng tuyển sinh hoặc đăng ký trực tuyến.",
    source: "Tài liệu Tuyển sinh ESH · Mục 3.2: Hồ sơ nhập học khối THCS (Lớp 6–9).",
  },
  {
    tag: "Code · DeepSeek R1",
    icon: "mdi:code-tags",
    prompt: "Viết hàm đảo chuỗi bằng Python",
    reply:
      "Trong Python, bạn có thể đảo ngược chuỗi cực gọn bằng slicing: `def reverse_str(s: str) -> str: return s[::-1]`. Độ phức tạp thời gian và bộ nhớ đều là O(n).",
    source: null,
  },
  {
    tag: "Tóm tắt · GPT-4o mini",
    icon: "mdi:text-box-check-outline",
    prompt: "Tóm tắt lợi ích của RAG trong chatbot trường học",
    reply:
      "RAG giúp chatbot tra cứu trực tiếp từ quy chế tuyển sinh & học phí chính thức trước khi trả lời, loại bỏ hiện tượng bịa thông tin (hallucination) và luôn kèm trích dẫn đoạn gốc để phụ huynh đối chiếu.",
    source: null,
  },
]

const chatTitle = (text) => (text.length > 50 ? text.substring(0, 50) + "..." : text)

/* ---------- Các tính năng có công tắc ---------- */

const FEATURES = [
  {
    icon: "mdi:history",
    tag: "Đồng bộ đám mây",
    text: "Lưu lại mọi cuộc trò chuyện",
    detail: "Mở lại trên máy khác, đổi tên nhanh, xoá hoặc tải trọn bộ lịch sử về định dạng JSON.",
    on: true,
    span: "wide",
    metric: "MongoDB Atlas · JSON Export",
  },
  {
    icon: "mdi:counter",
    tag: "Minh bạch chi phí",
    text: "Đếm token cho từng tin nhắn",
    detail: "Hiển thị rõ token chiều hỏi và chiều đáp (VD: hỏi 371 · đáp 41 · tổng 412 tokens).",
    on: true,
    span: "wide",
    metric: "371 in · 41 out · 412 total",
  },
  {
    icon: "mdi:book-open-page-variant-outline",
    tag: "Chống bịa đặt (RAG)",
    text: "Hiện nguồn khi bot ESH trả lời",
    detail: "Mỗi câu trả lời tuyển sinh đính kèm các đoạn tài liệu gốc từ cơ sở tri thức đã dùng.",
    on: true,
    span: "third",
    metric: "Top-10 Vector Chunks",
  },
  {
    icon: "mdi:shield-key-outline",
    tag: "Bảo mật tuyệt đối",
    text: "Giữ API key ở phía máy chủ",
    detail: "Trình duyệt chỉ gửi định danh botId, khóa bí mật nằm hoàn toàn trên backend server.",
    on: true,
    span: "third",
    metric: "Zero-Client Key Exposure",
  },
  {
    icon: "mdi:account-lock-outline",
    tag: "Kiểm soát tức thì",
    text: "Khoá tài khoản có hiệu lực ngay",
    detail: "Tài khoản bị chặn sẽ dừng phiên ngay ở yêu cầu kế tiếp mà không cần đợi JWT hết hạn.",
    on: true,
    span: "third",
    metric: "Middleware Guard · <2ms",
  },
]

const STEPS = [
  {
    step: "01",
    label: "Tạo tài khoản",
    time: "~15 giây",
    title: "Đăng ký bằng email của bạn.",
    detail: "Không cần thẻ tín dụng, không cần tự đi mua hay cấu hình API key phức tạp.",
  },
  {
    step: "02",
    label: "Chọn mô hình",
    time: "1 cú nhấp",
    title: "Chọn một bot ở cột trái.",
    detail: "Mỗi mô hình AI giữ không gian lịch sử riêng, chuyển đổi qua lại tức thì không mất mạch chat.",
  },
  {
    step: "03",
    label: "Trò chuyện & Lưu trữ",
    time: "Tự động 100%",
    title: "Gửi câu hỏi, mọi thứ tự lưu.",
    detail: "Mở lại bất kỳ lúc nào ở trang Lịch sử, đổi tên hội thoại, kiểm tra nguồn hoặc tải về máy.",
  },
]

const FAQ = [
  {
    cat: "Chi phí & Tài nguyên",
    q: "Dùng có mất phí không?",
    a: "Ứng dụng hoàn toàn miễn phí cho người dùng cuối. Chi phí gọi mô hình do quản trị viên cấu hình qua hệ thống API key tập trung và tận dụng các mô hình mở trên OpenRouter.",
    highlights: ["Miễn phí 100% cho sinh viên & phụ huynh", "Không cần thẻ quốc tế hay ví API riêng"],
  },
  {
    cat: "Cơ chế RAG · ESH",
    q: "Bot Tư vấn ESH lấy thông tin từ đâu?",
    a: "Từ bộ tài liệu tuyển sinh & học phí chính thức được nhúng (vector hóa) sẵn. Hệ thống truy xuất đoạn văn bản sát nghĩa nhất rồi mới tổng hợp câu trả lời, và từ chối trả lời khi thông tin không có trong tài liệu.",
    highlights: ["Đính kèm trích dẫn đoạn tài liệu gốc", "Chống ảo giác (Hallucination) tuyệt đối"],
  },
  {
    cat: "Quyền riêng tư",
    q: "Ai xem được lịch sử chat của tôi?",
    a: "Chỉ cá nhân bạn và quản trị viên hệ thống khi cần kiểm tra vận hành hoặc hỗ trợ kỹ thuật. Các người dùng khác hoàn toàn không thể truy cập.",
    highlights: ["Phân quyền JWT độc lập theo tài khoản", "Hỗ trợ tải về JSON hoặc xoá vĩnh viễn"],
  },
  {
    cat: "Đo lường LLM",
    q: "Token là gì, sao phải đếm?",
    a: "Token là đơn vị tách từ mà các mô hình ngôn ngữ lớn dùng để xử lý và tính tài nguyên. Hiển thị số token giúp bạn biết độ dài thực tế của từng câu hỏi và tối ưu cách đặt vấn đề.",
    highlights: ["Tách bạch rõ Token hỏi (Prompt) & đáp (Output)", "Cộng dồn tự động theo từng cuộc hội thoại"],
  },
  {
    cat: "Bảo mật tài khoản",
    q: "Quên mật khẩu thì làm sao?",
    a: "Bạn có thể xem hướng dẫn tại trang Quên mật khẩu để liên hệ quản trị viên cấp mật khẩu tạm thời, sau đó đăng nhập và đổi lại mật khẩu mới trong mục Hồ sơ cá nhân.",
    highlights: ["Cấp lại mật khẩu tạm nhanh qua Admin", "Mã hóa mật khẩu chuẩn bcrypt an toàn"],
  },
  {
    cat: "Mở rộng mô hình",
    q: "Có thêm được model khác không?",
    a: "Có. Quản trị viên có thể thêm bất kỳ endpoint nào tương thích chuẩn OpenAI (OpenRouter, GitHub Models, Groq, v.v.) chỉ với Tên hiển thị, Base URL, Model ID và API Key.",
    highlights: ["Tương thích mọi API chuẩn OpenAI SDK", "Thêm/ẩn bot tức thì không cần khởi động lại"],
  },
]

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/* ======================================================================= */

export default function LandingPage() {
  const rootRef = useRef(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [featLayout, setFeatLayout] = useState("bento")

  useEffect(() => {
    try {
      setLoggedIn(!!localStorage.getItem("token"))
    } catch {}
  }, [])

  // Hiệu ứng xuất hiện mượt khi cuộn tới
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
      { rootMargin: "0px 0px -10% 0px" }
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <ClickSpark
      sparkColor={["#ddd6fe", "#a78bfa", "#4cc2e9"]}
      sparkCount={7}
      sparkRadius={24}
      sparkSize={9}
      duration={420}
    >
      {/* Giao diện sáng mẫu D (người dùng chốt 2026-11-10): một nền Particles chung cho cả trang */}
      <div ref={rootRef} className={`lp ${bricolage.className}`} data-theme="light">
        <LightBackdrop variant="converge" />
        <main>
          <div className="lp-top">
            <Nav loggedIn={loggedIn} />
            <Hero loggedIn={loggedIn} />
          </div>
          <Showcase loggedIn={loggedIn} />
          <Features layout={featLayout} onChangeLayout={setFeatLayout} />
          <HowItWorks />
          <Admin />
          <Faq loggedIn={loggedIn} />
          <Cta />
        </main>
        <Footer loggedIn={loggedIn} />
      </div>
    </ClickSpark>
  )
}

/* ---------- Thanh điều hướng ---------- */

function Nav({ loggedIn }) {
  return (
    <header className="lp-nav lp-wrap">
      <Link href="/" className="lp-wordmark">
        <span className="lp-wordmark-badge" aria-hidden="true">
          <CyberFox size={24} />
        </span>
        <ShinyText text="ProjTT" color="#f5f3ff" shineColor="#c4b5fd" speed={3.5} />
      </Link>
      <nav aria-label="Chính">
        <a href="#thu">Thử hỏi</a>
        <a href="#tinh-nang">Tính năng</a>
        <a href="#cach-dung">Cách dùng</a>
        <a href="#quan-tri">Quản trị</a>
        <a href="#hoi-dap">Hỏi đáp</a>
        <Magnetic range={4} strength={0.08} innerStrength={0.04}>
          <Link
            href={loggedIn ? "/dashboard" : "/auth/login"}
            className="lp-cta-button lp-nav-action"
          >
            <span data-magnetic-label>{loggedIn ? "Vào khung chat" : "Đăng nhập"}</span>
            <Icon icon="mdi:arrow-right" className="lp-cta-arrow w-4 h-4" aria-hidden="true" />
          </Link>
        </Magnetic>
      </nav>
    </header>
  )
}

/* ---------- Đầu trang: khung chat chạy thật với dữ liệu minh hoạ ---------- */

function Hero({ loggedIn }) {
  const [botId, setBotId] = useState("esh")
  const [shown, setShown] = useState(HERO_BOTS[0].answer.length)
  const bot = HERO_BOTS.find((b) => b.id === botId)

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
    <section className="lp-hero lp-wrap" aria-labelledby="hero-title">
      <div className="lp-hero-copy">
        <div className="lp-hero-pill" data-ui>
          <span className="lp-pill-dot" aria-hidden="true" />
          <ShinyText text="Nền tảng hội tụ đa mô hình AI · 2026" color="#c4b5fd" shineColor="#ffffff" speed={3} />
        </div>
        <h1 id="hero-title" className="lp-display">
          <DecryptedText
            text="Mọi AI trong"
            animateOn="view"
            speed={38}
            maxIterations={10}
            revealDirection="start"
            characters="0123456789ABCDEF!@#$%"
          />
          <br />
          <GradientText colors={SILK_GRADIENT} animationSpeed={7} glow={0.22}>
            một khung chat
          </GradientText>
        </h1>
        <p className="lp-lead">
          Trò chuyện cùng DeepSeek R1, GPT-4o mini hay trợ lý tuyển sinh ESH (RAG) trong duy nhất một cửa sổ. Lịch sử
          tự động lưu trữ, đếm token minh bạch cho từng tin nhắn.
        </p>
        <div className="lp-hero-actions">
          <Magnetic range={6} strength={0.08} innerStrength={0.04}>
            <Link
              href={loggedIn ? "/dashboard" : "/auth/register"}
              className="lp-cta-button lp-hero-cta"
            >
              <span data-magnetic-label>{loggedIn ? "Mở khung chat ngay" : "Tạo tài khoản miễn phí"}</span>
              <Icon icon="mdi:arrow-right" className="lp-cta-arrow w-4 h-4" aria-hidden="true" />
            </Link>
          </Magnetic>
          <GlareHover as="a" href="#thu" className="lp-btn-glass" glareColor="#ddd6fe" glareOpacity={0.3}>
            <Icon icon="mdi:Creation" className="w-4 h-4 text-violet-300" />
            <span>Thử gõ câu hỏi ↓</span>
          </GlareHover>
        </div>
      </div>

      <div className="lp-stage">
        <CyberFox size={136} className="lp-mascot" animated label="Cáo Công Nghệ Cyber Fox - Linh vật thông minh của ProjTT" />
        <SpotlightCard
          className="lp-chat"
          data-ui
          spotlightColor="#c4b5fd"
          intensity={0.16}
          spotlightSize={360}
          borderGlow={0.88}
          proximity={110}
        >
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
              <CyberFox size={32} className="lp-avatar" />
              <div className="lp-msg lp-msg-ai" aria-live="polite">
                <p>
                  {bot.answer.slice(0, shown)}
                  {!done && <span className="lp-caret" aria-hidden="true" />}
                </p>
                {done && bot.sources.length > 0 && (
                  <details className="lp-sources" open>
                    <summary>Nguồn tài liệu xác thực ({bot.sources.length})</summary>
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
              <CountUp from={0} to={total} duration={1.2} /> tokens · hỏi{" "}
              <CountUp from={0} to={bot.tokens.input} duration={1} /> · đáp{" "}
              <CountUp from={0} to={bot.tokens.output} duration={1} />
            </span>
            <span className="lp-chat-saved">
              <span className="lp-saved-dot" /> Đã lưu vào lịch sử
            </span>
          </div>
        </SpotlightCard>
      </div>
    </section>
  )
}

/* ---------- Khu vực "Thử gõ một câu hỏi" (AI Prompt Composer & Live Sandbox) ---------- */

function buildSimulatedReply(question, isEsh) {
  const q = question.trim()
  if (!q) {
    return {
      botName: "Chờ câu hỏi của bạn",
      via: "Auto Router",
      answer: "Hãy nhập một câu hỏi bất kỳ vào ô nhập tin nhắn phía trên rồi bấm Gửi thử hoặc chọn một gợi ý mẫu.",
      source: null,
    }
  }
  const matchedPreset = EXAMPLES.find((ex) => ex.prompt.toLowerCase() === q.toLowerCase())
  if (matchedPreset) {
    return {
      botName: isEsh ? "Tư vấn ESH" : matchedPreset.tag.split("·")[1]?.trim() || "DeepSeek R1",
      via: matchedPreset.tag,
      answer: matchedPreset.reply,
      source: matchedPreset.source,
    }
  }
  if (isEsh) {
    return {
      botName: "Tư vấn ESH",
      via: "RAG · Gemini + Kho tri thức ESH",
      answer: `Hệ thống phát hiện từ khóa tuyển sinh/trường học trong câu hỏi "${chatTitle(q)}". Bot Tư vấn ESH sẽ truy xuất các đoạn tài liệu chính thức liên quan nhất để trả lời chính xác và đính kèm trích dẫn nguồn.`,
      source: "Kho tri thức Tuyển sinh & Học phí ESH (Vector RAG Search · Top 10 chunks).",
    }
  }
  return {
    botName: "DeepSeek R1 / GPT-4o mini",
    via: "OpenRouter · Đa năng",
    answer: `Câu hỏi "${chatTitle(q)}" thuộc chủ đề chung/lập trình/tóm tắt. Bạn có thể chọn DeepSeek R1 để suy luận sâu hoặc GPT-4o mini để nhận phản hồi tốc độ cao ngay trong khung chat.`,
    source: null,
  }
}

function Showcase({ loggedIn }) {
  const [text, setText] = useState("Học phí lớp 10 bao nhiêu?")
  const [submittedText, setSubmittedText] = useState("Học phí lớp 10 bao nhiêu?")
  const [replyShown, setReplyShown] = useState(999)
  const inputRef = useRef(null)

  const clean = text.trim()
  const isEsh = ESH_WORDS.test(clean)
  const tokens = clean ? Math.max(1, Math.ceil(clean.length / 3.5)) : 0

  const simClean = submittedText.trim()
  const simIsEsh = ESH_WORDS.test(simClean)
  const sim = buildSimulatedReply(simClean, simIsEsh)
  const outTokens = Math.max(12, Math.ceil(sim.answer.length / 3.8))
  const isStreaming = replyShown < sim.answer.length

  const triggerSend = (nextPrompt) => {
    const target = typeof nextPrompt === "string" ? nextPrompt : text
    if (!target.trim()) {
      inputRef.current?.focus()
      return
    }
    setSubmittedText(target)
    if (prefersReducedMotion()) {
      setReplyShown(999)
      return
    }
    setReplyShown(0)
  }

  useEffect(() => {
    if (replyShown >= sim.answer.length) return
    const id = setInterval(() => {
      setReplyShown((prev) => Math.min(sim.answer.length, prev + 4))
    }, 14)
    return () => clearInterval(id)
  }, [replyShown, sim.answer])

  const handleSubmit = (e) => {
    e.preventDefault()
    triggerSend(text)
  }

  return (
    <section id="thu" className="lp-show-sec" aria-labelledby="show-title">
      <div className="lp-show lp-wrap">
        <div className="lp-sec-toprow" data-reveal>
          <div className="lp-section-header">
            <span className="lp-sec-kicker">
              <span className="lp-sec-kicker-dot" />
              <span>01 · Khu vực tương tác trực tiếp (Live AI Sandbox)</span>
            </span>
            <h2 id="show-title" className="lp-head">
              Thử gõ{" "}
              <span className="lp-accent">một câu hỏi</span>
            </h2>
            <p className="lp-subhead">
              Nhập câu hỏi vào khung chat bên dưới và bấm <strong>Gửi thử</strong> — hệ thống tự nhận diện mô hình AI phù
              hợp, ước tính token và mô phỏng phản hồi ngay tức thì.
            </p>
          </div>

          <div className="lp-telemetry-strip" aria-label="Trạng thái định tuyến AI">
            <div className="lp-telemetry-pill">
              <span className="lp-telemetry-dot is-cyan" />
              <div>
                <strong>3 Mô hình</strong>
                <span>ESH · DeepSeek · GPT-4o</span>
              </div>
            </div>
            <div className="lp-telemetry-pill">
              <span className="lp-telemetry-dot is-violet" />
              <div>
                <strong>Vector RAG</strong>
                <span>Đối chiếu nguồn xác thực</span>
              </div>
            </div>
            <div className="lp-telemetry-pill">
              <Icon icon="mdi:lightning-bolt-outline" className="w-4 h-4 text-sky-300" />
              <div>
                <strong>~0.38s</strong>
                <span>Tốc độ phản hồi đầu tiên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Đường dẫn định tuyến AI trực quan (Pipeline Conduit) nối giữa câu hỏi và mô hình */}
        <div className={`lp-router-conduit ${isStreaming ? "is-streaming" : ""}`} data-ui data-reveal>
          <div className="lp-conduit-step is-active">
            <span className="lp-conduit-num">01</span>
            <div>
              <strong> Đầu vào (Prompt)</strong>
              <span>{clean ? `${tokens} tokens ước tính` : "Đang chờ câu hỏi"}</span>
            </div>
          </div>
          <div className="lp-conduit-line" aria-hidden="true">
            <span className="lp-conduit-pulse" />
          </div>
          <div className={`lp-conduit-step ${isEsh ? "is-esh" : "is-gen"}`}>
            <span className="lp-conduit-num">02</span>
            <div>
              <strong>{isEsh ? "Bộ định tuyến RAG · ESH" : "Bộ định tuyến Đa mô hình"}</strong>
              <span>{isEsh ? "Khớp từ khóa trường học & học bổng" : "Chủ đề lập trình · tóm tắt · đa năng"}</span>
            </div>
          </div>
          <div className="lp-conduit-line" aria-hidden="true">
            <span className="lp-conduit-pulse" />
          </div>
          <div className="lp-conduit-step is-output">
            <span className="lp-conduit-num">03</span>
            <div>
              <strong>{sim.botName}</strong>
              <span>{isStreaming ? "Đang truyền dữ liệu (Streaming)..." : `Hoàn tất · ~${outTokens} tokens đáp`}</span>
            </div>
          </div>
        </div>

        <div className="lp-sandbox-grid" data-ui>
          {/* Cột trái: Khung nhập câu hỏi (Chat Composer rõ ràng, có ô nhập + nút Gửi) */}
          <BorderGlow
            className="lp-sandbox-glow"
            backgroundColor="#100a22"
            borderRadius={22}
            glowColor="268 92 76"
            colors={["#c4b5fd", "#9c43fe", "#4cc2e9"]}
            glowRadius={34}
            glowIntensity={0.95}
            fillOpacity={0.32}
          >
            <SpotlightCard
              className="lp-composer"
              data-reveal
              style={{ "--i": 1 }}
              spotlightColor="#c4b5fd"
              intensity={0.18}
              spotlightSize={360}
              borderGlow={0.4}
              proximity={120}
            >
              <div className="lp-composer-head">
                <div className="lp-composer-title">
                  <span className="lp-composer-icon">
                    <Icon icon="mdi:message-text-fast-outline" className="w-4 h-4" />
                  </span>
                  <span>Khung nhập câu hỏi thử nghiệm</span>
                </div>
                <span className={`lp-route-badge ${isEsh ? "is-esh" : "is-gen"}`}>
                  <Icon icon={isEsh ? "mdi:school-outline" : "mdi:sparkles"} className="w-3.5 h-3.5" />
                  <span>{isEsh ? "Định tuyến: Tư vấn ESH (RAG)" : "Định tuyến: DeepSeek R1 / GPT-4o"}</span>
                </span>
              </div>

              <form className="lp-composer-form" onSubmit={handleSubmit}>
                <label htmlFor="try-input" className="lp-composer-label">
                  Nội dung tin nhắn của bạn:
                </label>
                <div className="lp-composer-input-wrap">
                  <Icon icon="mdi:chat-question-outline" className="lp-composer-input-icon" />
                  <input
                    ref={inputRef}
                    id="try-input"
                    type="text"
                    className="lp-composer-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Gõ câu hỏi tại đây (VD: Học phí lớp 10 bao nhiêu?)..."
                    maxLength={200}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {text && (
                    <button
                      type="button"
                      className="lp-composer-clear"
                      onClick={() => {
                        setText("")
                        inputRef.current?.focus()
                      }}
                      title="Xoá nội dung"
                      aria-label="Xoá nội dung"
                    >
                      <Icon icon="mdi:close-circle" className="w-4 h-4" />
                    </button>
                  )}
                  <GlareHover
                    as="button"
                    type="submit"
                    className="lp-btn-silk lp-composer-send"
                    glareColor="#ffffff"
                    glareOpacity={0.36}
                  >
                    <span>Gửi thử</span>
                    <Icon icon="mdi:send" className="w-4 h-4" />
                  </GlareHover>
                </div>
              </form>

              <dl className="lp-composer-meta" aria-live="polite">
                <div className="lp-meta-item">
                  <dt>Mô hình đề xuất</dt>
                  <dd>{clean ? (isEsh ? "Tư vấn ESH · Có trích nguồn" : "DeepSeek R1 · GPT-4o mini") : "Chờ nhập câu hỏi"}</dd>
                </div>
                <div className="lp-meta-item">
                  <dt>Tên lưu trong lịch sử</dt>
                  <dd>{clean ? chatTitle(clean) : "Cuộc trò chuyện mới"}</dd>
                </div>
                <div className="lp-meta-item">
                  <dt>Token ước tính</dt>
                  <dd>
                    <span className="lp-token-pill">~{tokens} tokens</span>
                  </dd>
                </div>
              </dl>

              {/* 3 gợi ý bấm chọn nhanh bằng PixelCard đồng bộ màu Silk */}
              <div className="lp-preset-section">
                <span className="lp-preset-label">Hoặc bấm chọn nhanh một câu hỏi mẫu:</span>
                <div className="lp-examples">
                  {EXAMPLES.map((ex, idx) => {
                    const picked = clean === ex.prompt
                    return (
                      <PixelCard
                        key={ex.prompt}
                        className={`lp-ex-card ${picked ? "is-picked" : ""}`}
                        colors={SILK_PIXEL_COLORS}
                        glowColor="#a78bfa"
                        gap={5}
                        speed={30}
                        pixelSize={2}
                        radius={12}
                        introDelay={idx * 100}
                        noFocus
                      >
                        <button
                          type="button"
                          className="lp-ex-btn"
                          onClick={() => {
                            setText(ex.prompt)
                            triggerSend(ex.prompt)
                          }}
                        >
                          <span className="lp-ex-tag">
                            <Icon icon={ex.icon} className="w-3.5 h-3.5" />
                            <span>{ex.tag}</span>
                          </span>
                          <span className="lp-ex-prompt">{ex.prompt}</span>
                        </button>
                      </PixelCard>
                    )
                  })}
                </div>
              </div>
            </SpotlightCard>
          </BorderGlow>

          {/* Cột phải: Khung mô phỏng phản hồi trực tiếp từ AI */}
          <BorderGlow
            className="lp-sandbox-glow"
            backgroundColor="#100a22"
            borderRadius={22}
            glowColor="195 88 72"
            colors={["#4cc2e9", "#9c43fe", "#c4b5fd"]}
            glowRadius={34}
            glowIntensity={0.95}
            fillOpacity={0.32}
          >
            <SpotlightCard
              className="lp-sandbox-preview"
              data-reveal
              style={{ "--i": 2 }}
              spotlightColor="#a78bfa"
              intensity={0.16}
              spotlightSize={340}
              borderGlow={0.4}
              proximity={110}
            >
              <div className="lp-preview-top">
                <div className="lp-window-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="lp-preview-title">Mô phỏng phản hồi trực tiếp</span>
                <span className="lp-preview-via">{sim.via}</span>
              </div>

              <div className="lp-preview-body">
                {simClean && <div className="lp-msg lp-msg-user">{simClean}</div>}
                <div className="lp-msg-row">
                  <CyberFox size={34} className="lp-avatar" />
                  <div className="lp-msg lp-msg-ai">
                    <div className="lp-preview-botname">
                      <span>{sim.botName}</span>
                      <span className="lp-preview-tok-badge">
                        +{outTokens} tok
                      </span>
                    </div>
                    <LatticeLoader
                      key={simClean}
                      className="lp-agent-status"
                      status={replyShown < sim.answer.length ? "working" : "done"}
                      label={simIsEsh ? "Đang truy xuất tài liệu tuyển sinh" : "Đang soạn câu trả lời"}
                      doneLabel={simIsEsh ? "Đã đối chiếu nguồn trong" : "Đã trả lời trong"}
                      pattern="orbit"
                      color="#c4b5fd"
                      doneColor="#4cc2e9"
                      glow
                      glowColor="#8b5cf6"
                      cellSize={4}
                      gap={2}
                      fontSize={12}
                    />
                    <p>
                      {sim.answer.slice(0, replyShown)}
                      {replyShown < sim.answer.length && <span className="lp-caret" aria-hidden="true" />}
                    </p>
                    {sim.source && replyShown >= sim.answer.length && (
                      <div className="lp-preview-source">
                        <Icon icon="mdi:check-decagram-outline" className="w-4 h-4 text-sky-300 flex-shrink-0" />
                        <span>{sim.source}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lp-preview-foot">
                <span className="lp-preview-hint">Muốn nhận câu trả lời đầy đủ từ máy chủ AI?</span>
                <GlareHover
                  as={Link}
                  href={loggedIn ? "/dashboard" : "/auth/login"}
                  className="lp-btn-silk lp-btn-sm"
                  glareColor="#ffffff"
                  glareOpacity={0.35}
                >
                  <span>{loggedIn ? "Mở trong Dashboard" : "Đăng nhập để chat thật"}</span>
                  <Icon icon="mdi:arrow-top-right" className="w-4 h-4" />
                </GlareHover>
              </div>
            </SpotlightCard>
          </BorderGlow>
        </div>
      </div>
    </section>
  )
}

/* ---------- Bật sẵn cho bạn (Features - Magic Bento Grid & Live Micro-Widgets) ---------- */

function FeatureVisual({ index, active }) {
  if (index === 0) {
    return (
      <div className={`lp-feat-viz ${active ? "is-on" : "is-off"}`}>
        <div className="lp-viz-row">
          <span className="lp-viz-chip is-violet">
            <Icon icon="mdi:cloud-check-outline" className="w-3.5 h-3.5" />
            <span>MongoDB Cloud Sync</span>
          </span>
          <span className="lp-viz-code">chat_esh_2026.json · 4.2 KB</span>
        </div>
        <div className="lp-viz-sessions">
          <span className="lp-viz-session is-current">● Học bổng Einstein lớp 10</span>
          <span className="lp-viz-session">○ Lộ trình ôn thi Python</span>
        </div>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className={`lp-feat-viz ${active ? "is-on" : "is-off"}`}>
        <div className="lp-viz-tok-head">
          <span>Chiều hỏi (Prompt): <strong>371 tok</strong></span>
          <span>Chiều đáp (AI): <strong className="text-sky-300">41 tok</strong></span>
          <span className="lp-viz-tok-total">Tổng: 412</span>
        </div>
        <div className="lp-viz-tok-bar" aria-hidden="true">
          <span className="lp-viz-tok-in" style={{ width: active ? "86%" : "30%" }} />
          <span className="lp-viz-tok-out" style={{ width: active ? "14%" : "8%" }} />
        </div>
      </div>
    )
  }
  if (index === 2) {
    return (
      <div className={`lp-feat-viz ${active ? "is-on" : "is-off"}`}>
        <div className="lp-viz-citations">
          <span className="lp-viz-cite">
            <Icon icon="mdi:file-document-check-outline" className="w-3.5 h-3.5 text-sky-300" />
            <span>[Đoạn 01] Quy chế Học bổng 2026 · 98%</span>
          </span>
          <span className="lp-viz-cite">
            <Icon icon="mdi:file-document-check-outline" className="w-3.5 h-3.5 text-violet-300" />
            <span>[Đoạn 04] Biểu phí THCS &amp; THPT · 94%</span>
          </span>
        </div>
      </div>
    )
  }
  if (index === 3) {
    return (
      <div className={`lp-feat-viz ${active ? "is-on" : "is-off"}`}>
        <div className="lp-viz-vault">
          <span className="lp-viz-node">Client: <code>botId=&quot;esh&quot;</code></span>
          <span className="lp-viz-arrow">──►</span>
          <span className="lp-viz-node is-locked">
            <Icon icon="mdi:lock-check-outline" className="w-3.5 h-3.5 text-sky-300" />
            <span>Server: <code>sk-or-••••9c2f</code></span>
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className={`lp-feat-viz ${active ? "is-on" : "is-off"}`}>
      <div className="lp-viz-guard">
        <span className={`lp-viz-status-dot ${active ? "is-live" : ""}`} />
        <span>
          {active
            ? "Middleware: Kiểm tra trạng thái khóa ở mỗi request (<2ms)"
            : "Tạm tắt: Chờ phiên JWT hết hạn theo chu kỳ"}
        </span>
      </div>
    </div>
  )
}

function Features({
  layout = "bento",
  onChangeLayout,
}) {
  const [on, setOn] = useState(FEATURES.map((f) => f.on))
  const toggle = (i) => setOn((prev) => prev.map((v, j) => (j === i ? !v : v)))
  const activeCount = on.filter(Boolean).length

  return (
    <section id="tinh-nang" className="lp-features" aria-labelledby="feat-title">
      <div className="lp-wrap">
        <div className="lp-sec-toprow" data-reveal>
          <div className="lp-section-header">
            <span className="lp-sec-kicker">
              <span className="lp-sec-kicker-dot" />
              <span>02 · Kiến trúc tính năng &amp; Bảo mật đa tầng</span>
            </span>
            <h2 id="feat-title" className="lp-head">
              Bật sẵn{" "}
              <span className="lp-accent">cho bạn</span>
            </h2>
            <p className="lp-subhead">
              Mọi tính năng thiết yếu từ lưu trữ lịch sử, đếm token đến bảo mật API key đều được kích hoạt tự động ngay
              khi bạn bắt đầu. Bấm vào từng thẻ để thử bật/tắt trực tiếp.
            </p>
          </div>

          <div className="lp-feat-toolbar" data-ui>
            <span className="lp-feat-counter-pill">
              <span className="lp-saved-dot" />
              <span>Đang bật <strong>{activeCount}/{FEATURES.length}</strong> mô-đun</span>
            </span>
            {onChangeLayout && (
              <div className="lp-feat-layout-switch" role="group" aria-label="Đổi kiểu hiển thị tính năng">
                <button
                  type="button"
                  className={layout === "bento" ? "is-active" : ""}
                  onClick={() => onChangeLayout("bento")}
                >
                  <Icon icon="mdi:view-dashboard-outline" className="w-4 h-4" />
                  <span>Bento Grid</span>
                </button>
                <button
                  type="button"
                  className={layout === "rows" ? "is-active" : ""}
                  onClick={() => onChangeLayout("rows")}
                >
                  <Icon icon="mdi:view-agenda-outline" className="w-4 h-4" />
                  <span>Dải ngang</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`lp-feat-grid ${layout === "bento" ? "is-bento" : "is-rows"}`} data-ui>
          {FEATURES.map((f, i) => {
            const active = on[i]
            return (
              <div
                key={f.text}
                className={`lp-feat-cell lp-feat-cell--${f.span || "third"}`}
                data-reveal
                style={{ "--i": i % 3 }}
              >
                <BorderGlow
                  className={`lp-feat-card ${active ? "is-on" : ""}`}
                  backgroundColor="#100a22"
                  borderRadius={20}
                  glowColor={i % 2 === 0 ? "268 92 78" : "195 88 74"}
                  colors={["#c4b5fd", "#9c43fe", "#4cc2e9"]}
                  glowRadius={32}
                  glowIntensity={0.95}
                  fillOpacity={0.38}
                >
                  <div className="lp-feat-card-inner" onClick={() => toggle(i)}>
                    <div className="lp-feat-top">
                      <div className="lp-feat-left">
                        <div className="lp-feat-icon">
                          <Icon icon={f.icon} className="w-5 h-5" />
                        </div>
                        <div className="lp-feat-copy">
                          <div className="lp-feat-title-row">
                            <h3 className="lp-feat-title">{f.text}</h3>
                            <span className="lp-feat-tag">{f.tag}</span>
                          </div>
                          <p className="lp-feat-detail">{f.detail}</p>
                        </div>
                      </div>

                      <div className="lp-feat-right">
                        <span className={`lp-feat-state ${active ? "is-on" : ""}`}>
                          {active ? "Đang bật" : "Đang tắt"}
                        </span>
                        <span className="lp-feat-switch" onClick={(e) => e.stopPropagation()}>
                          <SquishSwitch
                            checked={active}
                            onChange={() => toggle(i)}
                            ariaLabel={f.text}
                            width={52}
                            height={28}
                            radius={14}
                            trackColor="rgba(196, 181, 253, 0.16)"
                            trackOnColor="#7c3aed"
                            thumbColor="#d5cfe6"
                            thumbOnColor="#ffffff"
                          />
                        </span>
                      </div>
                    </div>

                    <FeatureVisual index={i} active={active} />
                  </div>
                </BorderGlow>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Ba bước để hỏi (HowItWorks - Interactive Silk Stage) ---------- */

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
      { rootMargin: "-42% 0px -42% 0px" }
    )
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section id="cach-dung" className="lp-how-sec" aria-labelledby="how-title">
      <div className="lp-how lp-wrap">
        <div className="lp-how-left">
          <div className="lp-section-header" data-reveal>
            <span className="lp-sec-kicker">
              <span className="lp-sec-kicker-dot" />
              <span>03 · Quy trình bắt đầu trong 30 giây</span>
            </span>
            <h2 id="how-title" className="lp-head">
              Ba bước{" "}
              <span className="lp-accent">để hỏi</span>
            </h2>
            <p className="lp-subhead">
              Không cần tự cài đặt môi trường hay quản lý khóa API. Bấm vào từng bước hoặc cuộn xuống để xem giao diện
              tương ứng.
            </p>
          </div>

          <div className="lp-how-steps" data-ui>
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                ref={(el) => (stepRefs.current[i] = el)}
                data-step={i}
                onClick={() => setActive(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setActive(i))}
                className={`lp-step-card ${active === i ? "is-active" : ""}`}
              >
                <div className="lp-step-card-top">
                  <div className="lp-step-num">BƯỚC {s.step}</div>
                  <span className="lp-step-time">{s.time}</span>
                </div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-detail">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <BorderGlow
          className="lp-how-stage-glow"
          backgroundColor="#0d081d"
          borderRadius={24}
          glowColor="266 90 76"
          colors={["#9c43fe", "#4cc2e9", "#c4b5fd"]}
          glowRadius={36}
          glowIntensity={0.95}
          fillOpacity={0.35}
        >
          <div className="lp-how-stage" data-ui>
            <div className="lp-how-aura" aria-hidden="true" />
            <div className="lp-how-tabs">
              <RubberSegment
                aria-label="Chuyển bước minh hoạ"
                items={STEPS.map((st, i) => ({ value: String(i), label: `${st.step}. ${st.label}` }))}
                value={String(active)}
                onChange={(v) => setActive(Number(v))}
                size="sm"
                radius={10}
                trackColor="rgba(10, 6, 22, 0.78)"
                thumbColor="#6d28d9"
                textColor="#d5cfe6"
                activeTextColor="#ffffff"
              />
            </div>

            <SpotlightCard
              className="lp-panel"
              data-state={active}
              spotlightColor="#c4b5fd"
              intensity={0.18}
              spotlightSize={300}
              borderGlow={0.9}
              proximity={100}
            >
              {active === 0 && (
                <form className="lp-form" onSubmit={(e) => e.preventDefault()} aria-label="Ví dụ form đăng ký">
                  <div className="lp-panel-head">
                    <CyberFox size={28} />
                    <div>
                      <p className="lp-panel-title">Tạo tài khoản ProjTT</p>
                      <span className="lp-panel-sub">Bước 01 · Chỉ cần email cá nhân</span>
                    </div>
                  </div>
                  <label>
                    Họ và tên
                    <input readOnly value="Minh Anh" tabIndex={-1} />
                  </label>
                  <label>
                    Địa chỉ Email
                    <input readOnly value="minhanh@gmail.com" tabIndex={-1} />
                  </label>
                  <label>
                    Mật khẩu bảo mật
                    <input readOnly type="password" value="••••••••" tabIndex={-1} />
                  </label>
                  <span className="lp-form-btn">Đăng ký ngay →</span>
                </form>
              )}
              {active === 1 && (
                <div className="lp-botlist">
                  <div className="lp-panel-head">
                    <CyberFox size={28} />
                    <div>
                      <p className="lp-panel-title">Chọn mô hình ChatBot AI</p>
                      <span className="lp-panel-sub">Bước 02 · Lịch sử tách biệt theo từng bot</span>
                    </div>
                  </div>
                  {HERO_BOTS.map((b, i) => (
                    <div key={b.id} className={`lp-botrow ${i === 0 ? "is-selected" : ""}`}>
                      <CyberFox size={28} className="lp-avatar" />
                      <div className="lp-botrow-info">
                        <strong>{b.name}</strong>
                        <span>{b.via}</span>
                      </div>
                      {i === 0 && <span className="lp-botrow-badge">Đang chọn</span>}
                    </div>
                  ))}
                  <p className="lp-panel-note">3 cuộc trò chuyện đã lưu với Tư vấn ESH</p>
                </div>
              )}
              {active === 2 && (
                <div className="lp-minichat">
                  <div className="lp-panel-head">
                    <CyberFox size={28} />
                    <div>
                      <p className="lp-panel-title">Tư vấn ESH · Học bổng Einstein</p>
                      <span className="lp-panel-sub">Bước 03 · Tự động lưu &amp; đếm token</span>
                    </div>
                  </div>
                  <div className="lp-msg lp-msg-user">{HERO_QUESTION}</div>
                  <div className="lp-msg lp-msg-ai">
                    <p>{HERO_BOTS[0].answer}</p>
                  </div>
                  <p className="lp-saved">
                    <span className="lp-saved-dot" /> Đã đồng bộ đám mây · 412 tokens
                  </p>
                </div>
              )}
            </SpotlightCard>

            <div className="lp-how-stage-foot">
              <span className="lp-stage-chip">
                <Icon icon="mdi:check-circle-outline" className="w-3.5 h-3.5 text-sky-300" />
                <span>Không cần tự cấu hình API Key</span>
              </span>
              <span className="lp-stage-chip">
                <Icon icon="mdi:cloud-sync-outline" className="w-3.5 h-3.5 text-violet-300" />
                <span>Đồng bộ lịch sử tức thì</span>
              </span>
            </div>
          </div>
        </BorderGlow>
      </div>
    </section>
  )
}

/* ---------- Dành cho quản trị viên (Admin - Command Center & Live Telemetry) ---------- */

const ADMIN_USERS = [
  {
    name: "Minh Anh",
    email: "minhanh@gmail.com",
    tokens: 18420,
    quotaPct: 78,
    chats: 12,
    status: "active",
    lastBot: "Tư vấn ESH (RAG)",
    lastPrompt: "Học bổng Tài năng Einstein xét tuyển hồ sơ đến ngày nào?",
  },
  {
    name: "Quốc Bảo",
    email: "baoq@gmail.com",
    tokens: 9310,
    quotaPct: 42,
    chats: 7,
    status: "active",
    lastBot: "DeepSeek R1",
    lastPrompt: "Tối ưu truy vấn aggregate MongoDB cho bảng lịch sử chat",
  },
  {
    name: "Thu Hà",
    email: "thuha.le@gmail.com",
    tokens: 2050,
    quotaPct: 12,
    chats: 2,
    status: "blocked",
    lastBot: "GPT-4o mini",
    lastPrompt: "Tóm tắt nội quy sử dụng hệ thống AI nội bộ",
  },
]
const ADMIN_BOTS = [
  {
    name: "DeepSeek R1",
    provider: "OpenRouter",
    model: "deepseek/deepseek-r1-0528:free",
    key: "sk-o…9c2f",
    hidden: false,
  },
  {
    name: "GPT-4o mini",
    provider: "GitHub Models",
    model: "openai/gpt-4o-mini",
    key: "ghp_…Qx7a",
    hidden: false,
  },
  {
    name: "Llama 3.3 70B",
    provider: "OpenRouter",
    model: "meta-llama/llama-3.3-70b-instruct",
    key: "sk-o…41d0",
    hidden: true,
  },
]

function Admin() {
  const [selected, setSelected] = useState(0)
  const selUser = ADMIN_USERS[selected]

  return (
    <section id="quan-tri" className="lp-admin-sec" aria-labelledby="admin-title">
      <div className="lp-admin lp-wrap">
        <div className="lp-admin-copy" data-reveal>
          <span className="lp-sec-kicker">
            <span className="lp-sec-kicker-dot" />
            <span>04 · Trung tâm điều hành &amp; Quản trị viên</span>
          </span>
          <h2 id="admin-title" className="lp-head">
            Quản trị viên{" "}
            <span className="lp-accent">thấy hết</span>
          </h2>
          <p className="lp-admin-text">
            Theo dõi lượng token tiêu thụ của từng thành viên, khoá/mở tài khoản tức thì và bật/tắt các mô hình AI mà
            không bao giờ để lộ API key xuống trình duyệt.
          </p>

          <div className="lp-admin-highlights" data-ui>
            <div className="lp-admin-stat">
              <span className="lp-admin-stat-val">100%</span>
              <span className="lp-admin-stat-label">API Key bảo mật tại Backend</span>
            </div>
            <div className="lp-admin-stat">
              <span className="lp-admin-stat-val">
                <Counter value={29780} locale="vi-VN" fontSize="1em" duration={0.8} />
              </span>
              <span className="lp-admin-stat-label">Tổng Tokens toàn hệ thống</span>
            </div>
          </div>

          <div className="lp-admin-dist" data-ui>
            <div className="lp-admin-dist-head">
              <span>Tỷ trọng sử dụng theo mô hình</span>
              <strong>3 Providers hoạt động</strong>
            </div>
            <div className="lp-admin-dist-bar" aria-hidden="true">
              <span style={{ width: "52%", background: "#9c43fe" }} />
              <span style={{ width: "31%", background: "#4cc2e9" }} />
              <span style={{ width: "17%", background: "#818cf8" }} />
            </div>
            <div className="lp-admin-dist-legend">
              <span><i style={{ background: "#9c43fe" }} /> Tư vấn ESH (52%)</span>
              <span><i style={{ background: "#4cc2e9" }} /> DeepSeek R1 (31%)</span>
              <span><i style={{ background: "#818cf8" }} /> GPT-4o mini (17%)</span>
            </div>
          </div>
        </div>

        <div className="lp-admin-frags" data-ui>
          <BorderGlow
            className="lp-admin-glow"
            backgroundColor="#100a22"
            borderRadius={20}
            glowColor="268 90 76"
            colors={["#c4b5fd", "#9c43fe", "#4cc2e9"]}
            glowRadius={32}
            glowIntensity={0.9}
            fillOpacity={0.34}
          >
            <SpotlightCard
              className="lp-admin-card"
              data-reveal
              style={{ "--i": 1 }}
              spotlightColor="#c4b5fd"
              intensity={0.15}
              spotlightSize={320}
              borderGlow={0.4}
              proximity={100}
            >
              <div className="lp-admin-card-head">
                <span className="lp-admin-card-title">
                  <Icon icon="mdi:account-group-outline" className="w-4 h-4 text-violet-300" />
                  <span>Giám sát người dùng &amp; lượng Token</span>
                </span>
                <span className="lp-admin-card-hint">Bấm vào một dòng để xem chi tiết</span>
              </div>

              <table className="lp-table">
                <caption className="lp-sr">Ví dụ bảng người dùng trong trang quản trị</caption>
                <thead>
                  <tr>
                    <th scope="col">Người dùng</th>
                    <th scope="col">Tokens đã dùng</th>
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
                        <div className="lp-user-cell">
                          <span className="lp-user-avatar">{u.name.charAt(0)}</span>
                          <div>
                            <strong>{u.name}</strong>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>
                          <CountUp from={0} to={u.tokens} duration={1.4} />
                        </strong>
                        <span>{u.chats} cuộc trò chuyện</span>
                        <div className="lp-user-bar" aria-hidden="true">
                          <div className="lp-user-bar-fill" style={{ width: `${u.quotaPct}%` }} />
                        </div>
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

              <div className="lp-admin-pick" aria-live="polite">
                <div className="lp-admin-pick-top">
                  <Icon icon="mdi:eye-outline" className="w-4 h-4 text-sky-300 flex-shrink-0" />
                  <span>
                    Đang kiểm tra lịch sử của <strong>{selUser.name}</strong> ({selUser.chats} hội thoại ·{" "}
                    <strong>
                      <Counter value={selUser.tokens} locale="vi-VN" fontSize="1em" duration={0.6} /> tokens
                    </strong>
                    )
                  </span>
                </div>
                <div className="lp-admin-pick-log">
                  <span className="lp-admin-log-bot">{selUser.lastBot}</span>
                  <span className="lp-admin-log-q">&ldquo;{selUser.lastPrompt}&rdquo;</span>
                </div>
              </div>
            </SpotlightCard>
          </BorderGlow>

          <BorderGlow
            className="lp-admin-glow"
            backgroundColor="#100a22"
            borderRadius={20}
            glowColor="195 88 74"
            colors={["#4cc2e9", "#9c43fe", "#c4b5fd"]}
            glowRadius={32}
            glowIntensity={0.9}
            fillOpacity={0.34}
          >
            <SpotlightCard
              className="lp-admin-card"
              data-reveal
              style={{ "--i": 2 }}
              spotlightColor="#a78bfa"
              intensity={0.15}
              spotlightSize={320}
              borderGlow={0.4}
              proximity={100}
            >
              <div className="lp-admin-card-head">
                <span className="lp-admin-card-title">
                  <Icon icon="mdi:key-chain-variant" className="w-4 h-4 text-violet-300" />
                  <span>Quản lý mô hình AI &amp; Khóa API (Server Vault)</span>
                </span>
                <span className="lp-admin-card-hint">Chuẩn OpenAI Compatible</span>
              </div>

              <ul className="lp-botkeys" aria-label="Ví dụ danh sách ChatBot">
                {ADMIN_BOTS.map((b) => (
                  <li key={b.name}>
                    <div className="lp-botkey-main">
                      <span className="lp-botkey-icon">
                        <Icon icon="mdi:robot-outline" className="w-4 h-4" />
                      </span>
                      <div>
                        <strong>
                          {b.name} <small className="lp-botkey-provider">{b.provider}</small>
                        </strong>
                        <span>{b.model}</span>
                      </div>
                    </div>
                    <code>{b.key}</code>
                    <span className={`lp-badge ${b.hidden ? "is-blocked" : ""}`}>{b.hidden ? "Tạm ẩn" : "Đang bật"}</span>
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </BorderGlow>
        </div>
      </div>
    </section>
  )
}

/* ---------- Hỏi đáp nhanh (FAQ - Đồng bộ Silk Glass) ---------- */

function Faq({ loggedIn }) {
  const [sel, setSel] = useState(0)
  const currentFaq = FAQ[sel]

  return (
    <section id="hoi-dap" className="lp-faq" aria-labelledby="faq-title">
      <div className="lp-wrap lp-faq-grid">
        <div className="lp-faq-list">
          <span className="lp-sec-kicker">
            <span className="lp-sec-kicker-dot" />
            <span>05 · Giải đáp thắc mắc thường gặp</span>
          </span>
          <h2 id="faq-title" className="lp-head">
            Hỏi đáp{" "}
            <span className="lp-accent">nhanh</span>
          </h2>
          <ul data-ui>
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
                  <span className="lp-faq-num">0{i + 1}</span>
                  <span className="lp-faq-q">{item.q}</span>
                  <span className="lp-faq-cat-pill">{item.cat}</span>
                  <Icon icon="mdi:chevron-right" className="lp-faq-arrow" />
                </button>
                <p id={`faq-a-${i}`} className="lp-faq-inline" hidden={sel !== i}>
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <BorderGlow
          className="lp-faq-pane-glow"
          backgroundColor="#100a22"
          borderRadius={22}
          glowColor="268 90 76"
          colors={["#c4b5fd", "#9c43fe", "#4cc2e9"]}
          glowRadius={36}
          glowIntensity={0.95}
          fillOpacity={0.35}
        >
          <SpotlightCard
            className="lp-faq-pane"
            data-ui
            aria-hidden="true"
            spotlightColor="#c4b5fd"
            intensity={0.16}
            spotlightSize={340}
            borderGlow={0.4}
            proximity={110}
          >
            <div className="lp-faq-pane-head">
              <CyberFox size={38} />
              <div>
                <span className="lp-faq-pane-kicker">
                  Câu hỏi 0{sel + 1} · {currentFaq.cat}
                </span>
                <h3 className="lp-faq-pane-q">{currentFaq.q}</h3>
              </div>
            </div>

            <div className="lp-faq-answer">
              <BlurText
                key={sel}
                text={currentFaq.a}
                animateBy="words"
                direction="bottom"
                delay={18}
                stepDuration={0.28}
                blur={8}
                distance={8}
              />
            </div>

            {currentFaq.highlights && (
              <div className="lp-faq-highlights">
                {currentFaq.highlights.map((hl) => (
                  <div key={hl} className="lp-faq-hl-item">
                    <Icon icon="mdi:check-decagram-outline" className="w-4 h-4 text-sky-300 flex-shrink-0" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="lp-faq-pane-foot">
              <GlareHover
                as={Link}
                href={loggedIn ? "/dashboard" : "/auth/register"}
                className="lp-btn-glass"
                glareColor="#ddd6fe"
                glareOpacity={0.3}
              >
                <span>{loggedIn ? "Trải nghiệm ngay trong Dashboard" : "Tạo tài khoản trải nghiệm ngay"}</span>
                <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </GlareHover>
            </div>
          </SpotlightCard>
        </BorderGlow>
      </div>
    </section>
  )
}

/* ---------- Kêu gọi đăng ký (CTA) ---------- */

function Cta() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const submit = (e) => {
    e.preventDefault()
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""
    router.push(`/auth/register${q}`)
  }
  return (
    <section id="bat-dau" className="lp-cta" aria-labelledby="cta-title">
      <div className="lp-wrap">
        <BorderGlow
          className="lp-cta-glow"
          backgroundColor="#110b24"
          borderRadius={26}
          glowColor="268 92 78"
          colors={["#c4b5fd", "#9c43fe", "#4cc2e9"]}
          glowRadius={42}
          glowIntensity={1.0}
          fillOpacity={0.4}
        >
          <SpotlightCard
            className="lp-cta-card"
            data-ui
            data-reveal
            spotlightColor="#c4b5fd"
            intensity={0.18}
            spotlightSize={380}
            borderGlow={0.4}
            proximity={120}
          >
            <form onSubmit={submit} className="lp-cta-form">
              <span className="lp-sec-kicker">
                <span className="lp-sec-kicker-dot" />
                <span>06 · Sẵn sàng trò chuyện cùng đa mô hình AI</span>
              </span>
              <h2 id="cta-title" className="lp-head lp-cta-title">
                Bắt đầu ngay với{" "}
                <span className="lp-accent">email của bạn</span>
              </h2>
              <p className="lp-cta-note">
                Chúng tôi sẽ chuyển bạn tới trang đăng ký với email được điền sẵn — chỉ cần đặt mật khẩu là vào thẳng khung
                chat đa mô hình.
              </p>
              <div className="lp-cta-bar">
                <label htmlFor="cta-email" className="lp-sr">
                  Email của bạn
                </label>
                <Icon icon="mdi:email-fast-outline" className="lp-cta-bar-icon" />
                <input
                  id="cta-email"
                  type="email"
                  placeholder="nhap-email-cua-ban@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Magnetic range={4} strength={0.08} innerStrength={0.04}>
                  <button type="submit" className="lp-cta-button">
                    <span data-magnetic-label>Đăng ký miễn phí</span>
                    <Icon icon="mdi:arrow-right" className="lp-cta-arrow w-4 h-4" aria-hidden="true" />
                  </button>
                </Magnetic>
              </div>

              <div className="lp-cta-perks">
                <span>
                  <Icon icon="mdi:check-circle-outline" className="w-4 h-4 text-sky-300" />
                  Miễn phí 100% cho người dùng
                </span>
                <span>
                  <Icon icon="mdi:shield-lock-outline" className="w-4 h-4 text-violet-300" />
                  Không cần tự cấu hình API Key
                </span>
                <span>
                  <Icon icon="mdi:history" className="w-4 h-4 text-sky-300" />
                  Lưu &amp; xuất lịch sử JSON mọi lúc
                </span>
              </div>
            </form>
          </SpotlightCard>
        </BorderGlow>
      </div>
    </section>
  )
}

/* ---------- Chân trang dạng Bento Silk ---------- */

function Clock() {
  const [now, setNow] = useState(null)
  useEffect(() => {
    const read = () => {
      const [h, m] = new Date()
        .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" })
        .split(":")
        .map(Number)
      return { h, m }
    }
    setNow(read())
    const id = setInterval(() => setNow(read()), 15000)
    return () => clearInterval(id)
  }, [])
  if (!now) return <span className="lp-tile-big">--:--</span>
  // Giờ/phút cuộn như đồng hồ cơ khi đổi số (Counter của React Bits)
  return (
    <span className="lp-tile-big" aria-label={`${now.h} giờ ${now.m} phút`}>
      <Counter value={now.h} minDigits={2} fontSize="1em" />:
      <Counter value={now.m} minDigits={2} fontSize="1em" />
    </span>
  )
}

function Footer({ loggedIn }) {
  return (
    <footer className="lp-footer">
      <div className="lp-tiles" data-ui>
        <PixelCard
          className="lp-tile lp-tile-statement"
          colors={SILK_PIXEL_COLORS}
          glowColor="#8b5cf6"
          gap={6}
          speed={28}
          radius={16}
          intro={false}
          noFocus
        >
          <p>Một khung chat hội tụ mọi mô hình AI, cùng trợ lý tuyển sinh ESH luôn trực tuyến 24/7.</p>
          <small>© 2026 ProjTT · Đồ án thực tập chuyên ngành AI & Web.</small>
        </PixelCard>

        <PixelCard
          className="lp-tile lp-tile-nav"
          colors={SILK_PIXEL_COLORS}
          glowColor="#8b5cf6"
          gap={6}
          speed={28}
          radius={16}
          intro={false}
          noFocus
        >
          <span className="lp-tile-kicker">Điều hướng</span>
          <nav className="lp-tile-nav-inner" aria-label="Chân trang">
            <a href="#thu">Thử gõ câu hỏi</a>
            <a href="#tinh-nang">Tính năng bật sẵn</a>
            <a href="#cach-dung">Ba bước sử dụng</a>
            <a href="#quan-tri">Bảng quản trị</a>
            <a href="#hoi-dap">Hỏi đáp nhanh</a>
          </nav>
        </PixelCard>

        <PixelCard
          className="lp-tile lp-tile-time"
          colors={SILK_PIXEL_COLORS}
          glowColor="#a78bfa"
          gap={6}
          speed={28}
          radius={16}
          intro={false}
          noFocus
        >
          <span className="lp-tile-kicker">
            <span className="lp-saved-dot" /> Giờ Việt Nam (GMT+7)
          </span>
          <Clock />
        </PixelCard>

        <PixelCard
          className="lp-tile lp-tile-mail"
          colors={SILK_PIXEL_COLORS}
          glowColor="#818cf8"
          gap={6}
          speed={28}
          radius={16}
          intro={false}
          noFocus
        >
          <span className="lp-tile-kicker">Mã nguồn dự án</span>
          <a
            href="https://github.com/Thinh065/ProjTT"
            target="_blank"
            rel="noreferrer"
            className="lp-tile-github"
          >
            <Icon icon="mdi:github" className="w-5 h-5 text-violet-300" />
            <span>Thinh065/ProjTT</span>
            <Icon icon="mdi:arrow-top-right" className="w-4 h-4 text-violet-400" />
          </a>
        </PixelCard>

        <SpotlightCard
          className="lp-tile lp-tile-word"
          spotlightColor="#c4b5fd"
          intensity={0.18}
          spotlightSize={380}
          borderGlow={0.85}
          proximity={120}
        >
          <div className="lp-tile-word-inner">
            <CyberFox size={84} />
            <div className="lp-tile-brand-wrap">
              {/* Wordmark TechText (React Bits): chữ thành nét đứt kiểu bản vẽ kỹ thuật khi rê chuột */}
              <div className="lp-tile-brand">
                <TechText
                  text="ProjTT"
                  fontFamily={bricolage.style.fontFamily}
                  fontWeight={800}
                  fontSize={88}
                  align="left"
                  color="currentColor"
                  accentColor="#8b5cf6"
                  reach={160}
                  labels={false}
                  specks={10}
                />
              </div>
              <span className="lp-tile-brand-sub">Multi-Model AI Workspace</span>
            </div>
          </div>
        </SpotlightCard>

        <GlareHover
          as={Link}
          href={loggedIn ? "/dashboard" : "/auth/login"}
          className="lp-tile lp-tile-go"
          glareColor="#ffffff"
          glareOpacity={0.32}
        >
          <div className="lp-tile-go-top">
            <span className="lp-tile-go-label">{loggedIn ? "Vào khung chat" : "Đăng nhập để hỏi"}</span>
          </div>
          <div className="lp-tile-go-icon">
            <svg width="44" height="44" viewBox="0 0 56 56" aria-hidden="true">
              <path d="M12 44 L44 12 M20 12 H44 V36" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </div>
        </GlareHover>
      </div>
    </footer>
  )
}
