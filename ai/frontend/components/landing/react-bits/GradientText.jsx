/*
 * GradientText — từ React Bits (https://github.com/DavidHDev/react-bits)
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0.
 * Được dùng như một phần của website; không bán hay phân phối lại riêng component này.
 * Toàn văn giấy phép: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
 */
'use client';

import { useEffect, useRef } from 'react';
import './GradientText.css';

const DEFAULT_PALETTE = ['#ffffff', '#ddd6fe', '#a78bfa', '#818cf8'];

const ANGLES = {
  toTop: 0,
  toRight: 90,
  toBottom: 180,
  toLeft: 270,
  toTopRight: 45,
  toBottomRight: 135,
  toBottomLeft: 225,
  toTopLeft: 315
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export default function GradientText({
  children,
  className = '',
  colors = DEFAULT_PALETTE,
  animationSpeed = 7,
  showBorder = false,
  direction = 'toRight',
  angle = 90,
  scale = 2.2,
  yoyo = true,
  pauseOnHover = false,
  followPointer = true,
  borderWidth = 1.5,
  glow = 0.28,
  style = {}
}) {
  const rootRef = useRef(null);
  const wakeRef = useRef(null);

  const palette = Array.isArray(colors) && colors.length >= 2 ? colors : DEFAULT_PALETTE;
  const resolvedAngle = direction ? (ANGLES[direction] ?? angle) : angle;

  const settingsRef = useRef({
    palette,
    speed: Math.max(0.2, animationSpeed),
    angle: resolvedAngle,
    scale: Math.max(1, scale),
    yoyo: Boolean(yoyo),
    pauseOnHover: Boolean(pauseOnHover),
    followPointer: Boolean(followPointer)
  });

  settingsRef.current = {
    palette,
    speed: Math.max(0.2, animationSpeed),
    angle: resolvedAngle,
    scale: Math.max(1, scale),
    yoyo: Boolean(yoyo),
    pauseOnHover: Boolean(pauseOnHover),
    followPointer: Boolean(followPointer)
  };

  useEffect(() => {
    wakeRef.current?.();
  }, [palette, animationSpeed, resolvedAngle, scale, yoyo, pauseOnHover, followPointer]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const state = {
      time: 0,
      visible: true,
      inside: false,
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      vx: 0,
      vy: 0,
      pull: 0
    };

    let raf = 0;
    let last = performance.now();
    let alive = true;

    const paint = () => {
      const s = settingsRef.current;
      const list = s.palette;
      const cycle = state.time / s.speed;
      const loop = [...list, list[0]];
      const period = 100 * s.scale;
      let offset;
      if (s.yoyo) {
        const swing = cycle % 2;
        const t = swing < 1 ? swing : 2 - swing;
        offset = (0.5 - Math.cos(Math.PI * t) / 2) * (period - 100);
      } else {
        offset = (cycle % 1) * period;
      }
      offset += (state.px - 0.5) * period * 0.5 * state.pull;
      const stops = loop.map(
        (color, i) => `${color} ${((i / (loop.length - 1)) * period - offset).toFixed(2)}%`
      );
      const image = `repeating-linear-gradient(${s.angle}deg, ${stops.join(', ')})`;
      root.style.setProperty('--gt-gradient', image);
    };

    const tick = (now) => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const paused = reduce || (s.pauseOnHover && state.inside);
      if (!paused) state.time += dt;
      const target = s.followPointer && state.inside ? 1 : 0;
      state.pull += (target - state.pull) * (1 - Math.exp(-dt * 6));
      const stiffness = 160;
      state.vx += ((state.x - state.px) * stiffness - state.vx * 2 * Math.sqrt(stiffness)) * dt;
      state.vy += ((state.y - state.py) * stiffness - state.vy * 2 * Math.sqrt(stiffness)) * dt;
      state.px += state.vx * dt;
      state.py += state.vy * dt;
      paint();
      const settling =
        Math.abs(state.pull - target) > 0.001 || Math.abs(state.vx) + Math.abs(state.vy) > 0.001;
      if (!state.visible || (paused && !settling)) return;
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = () => {
      paint();
      wake();
    };

    const locate = (event) => {
      const rect = root.getBoundingClientRect();
      state.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      state.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    };
    const onEnter = (event) => {
      locate(event);
      if (!state.inside) {
        state.px = state.x;
        state.py = state.y;
      }
      state.inside = true;
      wake();
    };
    const onMove = (event) => {
      locate(event);
      wake();
    };
    const onLeave = () => {
      state.inside = false;
      wake();
    };

    const observer = new IntersectionObserver((entries) => {
      state.visible = entries.some((entry) => entry.isIntersecting);
      if (state.visible) wake();
    });
    observer.observe(root);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    paint();
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      wakeRef.current = null;
    };
  }, []);

  const loop = [...palette, palette[0]];

  return (
    <span
      ref={rootRef}
      className={`gradient-text${showBorder ? ' gradient-text--border' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--gt-gradient': `linear-gradient(${resolvedAngle}deg, ${loop.join(', ')})`,
        '--gt-border': `${borderWidth}px`,
        '--gt-glow': clamp(glow, 0, 1),
        ...style
      }}
    >
      <span className="gradient-text__inner">
        <span className="gradient-text__content">{children}</span>
        {glow > 0 ? (
          <span className="gradient-text__glow" aria-hidden="true">
            {children}
          </span>
        ) : null}
      </span>
    </span>
  );
}
