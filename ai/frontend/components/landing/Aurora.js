"use client"

import { useEffect, useRef } from "react"

/**
 * Nền "cực quang" động vẽ bằng WebGL (mesh gradient uốn lượn).
 * - Vùng sáng đi theo con trỏ bằng lò xo nên có quán tính: dừng chuột thì nó còn trôi tiếp.
 * - Tạm dừng khi ra khỏi màn hình hoặc tab bị ẩn.
 * - Người dùng bật "giảm chuyển động": chỉ vẽ một khung hình tĩnh.
 * - Không có WebGL: dùng lớp CSS dự phòng (.lp-aurora-fallback).
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;     // 0..1, gốc ở góc dưới trái
uniform float uEnergy;   // tốc độ con trỏ, làm vùng sáng bùng lên
uniform float uIntensity;
uniform vec2 uCalm;      // tâm vùng tối giữ cho chữ dễ đọc

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 1.9 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float t = uTime * 0.05;

  // Con trỏ xoáy nhẹ trường màu quanh nó
  vec2 dm = p - m;
  float near = exp(-dot(dm, dm) * 6.0);
  p += vec2(-dm.y, dm.x) * near * (0.18 + uEnergy * 0.45);

  // Domain warping ở tần số thấp: dải mềm, uốn lượn chậm
  vec2 q = vec2(fbm(p * 0.9 + vec2(0.0, t)), fbm(p * 0.9 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 1.1 + q * 1.6 + vec2(1.7, 9.2) + t * 1.2),
                fbm(p * 1.1 + q * 1.6 + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.0 + r * 1.8);

  // Hai dải cực quang: lõi sáng mảnh + quầng mềm
  float w1 = uv.y - 0.74 - (f - 0.5) * 0.7 - sin(p.x * 1.4 + t * 2.5) * 0.06;
  float w2 = uv.y - 0.50 - (r.y - 0.5) * 0.6 - sin(p.x * 2.0 - t * 1.8) * 0.05;
  float band = exp(-w1 * w1 * 45.0) * 1.1 + exp(-w1 * w1 * 6.0) * 0.55
             + exp(-w2 * w2 * 70.0) * 0.7 + exp(-w2 * w2 * 9.0) * 0.3;
  // Rèm tia dọc
  float rays = 0.55 + 0.45 * smoothstep(0.3, 0.8, noise(vec2(p.x * 7.0 + r.x * 2.5, t * 1.5)));
  // Mảng khói rất mờ để nền không chết
  float veil = smoothstep(0.5, 0.85, f) * 0.22;
  // Che bớt từng vùng lớn để có chỗ tối, chỗ sáng
  float mask = smoothstep(0.3, 0.7, fbm(p * 0.55 + vec2(t * 0.6, -t * 0.4)));

  vec3 lime   = vec3(0.855, 0.980, 0.612);
  vec3 jade   = vec3(0.110, 0.780, 0.560);
  vec3 cyan   = vec3(0.130, 0.700, 0.860);
  vec3 amber  = vec3(1.000, 0.620, 0.240);

  vec3 col = mix(jade, lime, smoothstep(0.3, 0.75, r.x));
  col = mix(col, cyan, smoothstep(0.5, 0.85, r.y) * 0.75);
  col = mix(col, amber, smoothstep(0.62, 0.9, q.x) * 0.5);

  float glow = (band * rays + veil) * (0.45 + 0.55 * mask);

  // Vùng sáng theo chuột: lõi ấm như ngọn lửa
  vec3 flame = mix(lime, amber, 0.45 + 0.25 * sin(t * 6.0));
  float spot = exp(-dot(dm, dm) * (14.0 - uEnergy * 6.0)) * (0.22 + uEnergy * 0.6);

  // Giữ vùng sau tiêu đề tối để chữ đọc rõ, mờ dần xuống đáy để nối với section dưới
  vec2 dc = (uv - uCalm) * vec2(aspect * 1.0, 1.7);
  float calm = 1.0 - 0.6 * exp(-dot(dc, dc) * 3.0);
  float floorFade = smoothstep(0.0, 0.25, uv.y);

  vec3 light = (col * glow + flame * spot) * uIntensity * calm * floorFade;
  vec3 base = vec3(0.059);
  vec3 light = (col * glow + flame * spot) * uIntensity * calm * floorFade;
  // Cộng sáng mềm (không bị cháy trắng)
  vec3 outc = base + light / (1.0 + light * 0.6);

  // Nhiễu hạt nhỏ chống sọc màu
  outc += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(outc, 1.0);
}
`

export default function Aurora({ intensity = 1.6, calm = [0.24, 0.36], className = "" }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" })
    if (!gl) {
      canvas.parentElement?.classList.add("lp-aurora-nogl")
      return
    }

    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
      return s
    }
    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    } catch (err) {
      console.warn("Aurora shader:", err)
      canvas.parentElement?.classList.add("lp-aurora-nogl")
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = (n) => gl.getUniformLocation(prog, n)
    const uRes = u("uRes"), uTime = u("uTime"), uMouse = u("uMouse"), uEnergy = u("uEnergy")
    gl.uniform1f(u("uIntensity"), intensity)
    gl.uniform2f(u("uCalm"), calm[0], 1 - calm[1])

    // Vẽ ở nửa độ phân giải: nền mềm nên không thấy khác, nhẹ hơn nhiều
    const SCALE = 0.5
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(r.width * dpr * SCALE))
      const h = Math.max(1, Math.round(r.height * dpr * SCALE))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, w, h)
    }

    // Lò xo cho vùng sáng: có quán tính và hơi vượt quá rồi mới dừng
    const pos = { x: 0.78, y: 0.42 }
    const vel = { x: 0, y: 0 }
    const target = { x: 0.78, y: 0.42 }
    let energy = 0
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      if (e.clientY < r.top - 200 || e.clientY > r.bottom + 200) return
      target.x = (e.clientX - r.left) / r.width
      target.y = 1 - (e.clientY - r.top) / r.height
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now()
    let frame = 0
    let last = start
    let visible = true

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = 26, damping = 0.86
      vel.x = (vel.x + (target.x - pos.x) * k * dt) * damping
      vel.y = (vel.y + (target.y - pos.y) * k * dt) * damping
      pos.x += vel.x
      pos.y += vel.y
      const speed = Math.hypot(vel.x, vel.y) / Math.max(dt, 0.001)
      energy += (Math.min(1, speed * 0.35) - energy) * 0.08

      gl.uniform1f(uTime, (now - start) / 1000 + 40)
      gl.uniform2f(uMouse, pos.x, pos.y)
      gl.uniform1f(uEnergy, energy)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (now) => {
      frame = 0
      if (!visible || document.hidden) return
      draw(now)
      frame = requestAnimationFrame(loop)
    }
    const play = () => {
      if (!reduce && !frame && visible && !document.hidden) {
        last = performance.now()
        frame = requestAnimationFrame(loop)
      }
    }

    resize()
    draw(start)
    canvas.parentElement?.classList.add("is-ready")

    const ro = new ResizeObserver(() => {
      resize()
      if (reduce) draw(performance.now())
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) play()
    })
    io.observe(canvas)
    const onVis = () => play()
    document.addEventListener("visibilitychange", onVis)
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true })
    play()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pointermove", onMove)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, calm[0], calm[1]])

  return (
    <div className={`lp-aurora ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
