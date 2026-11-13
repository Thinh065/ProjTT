/*
 * GlareHover — từ React Bits (https://github.com/DavidHDev/react-bits)
 * Copyright (c) 2026 David Haz. MIT + Commons Clause License Condition v1.0.
 * Được dùng như một phần của website; không bán hay phân phối lại riêng component này.
 * Toàn văn giấy phép: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
 */
'use client';

import './GlareHover.css';

const hexToRgba = (hex = '#e9d5ff', opacity = 0.32) => {
  const clean = hex.replace('#', '');
  if (/^[\dA-Fa-f]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return `rgba(233, 213, 255, ${opacity})`;
};

export default function GlareHover({
  as: Component = 'button',
  children,
  className = '',
  glareColor = '#e9d5ff',
  glareOpacity = 0.34,
  glareAngle = -42,
  glareSize = 230,
  transitionDuration = 640,
  style = {},
  ...rest
}) {
  const rgba = hexToRgba(glareColor, glareOpacity);

  return (
    <Component
      className={`rb-glare-hover${className ? ` ${className}` : ''}`}
      style={{
        '--gh-angle': `${glareAngle}deg`,
        '--gh-duration': `${transitionDuration}ms`,
        '--gh-size': `${glareSize}%`,
        '--gh-rgba': rgba,
        ...style
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
