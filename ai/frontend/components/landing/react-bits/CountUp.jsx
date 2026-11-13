/*
 * CountUp — từ React Bits (https://github.com/DavidHDev/react-bits)
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0.
 * Được dùng như một phần của website; không bán hay phân phối lại riêng component này.
 * Toàn văn giấy phép: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
 */
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — Bộ đếm số động mượt mà (Pure React + requestAnimationFrame)
 * Hỗ trợ định dạng số, phân tách hàng nghìn, và tự động kích hoạt khi vào màn hình.
 */
export default function CountUp({
  from = 0,
  to = 100,
  duration = 1.8,
  separator = ',',
  decimals = 0,
  className = '',
  prefix = '',
  suffix = '',
  startOnView = true,
}) {
  const [value, setValue] = useState(from);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const dur = Math.max(0.1, duration) * 1000;

      const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / dur);
        const current = from + (to - from) * easeOutExpo(progress);
        setValue(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setValue(to);
        }
      };

      requestAnimationFrame(step);
    };

    if (!startOnView) {
      run();
      return;
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        run();
        io.disconnect();
      }
    });

    io.observe(el);
    return () => io.disconnect();
  }, [from, to, duration, startOnView]);

  const formatted = Number(value.toFixed(decimals)).toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
