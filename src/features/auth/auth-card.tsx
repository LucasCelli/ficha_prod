"use client";

import { type ReactNode, useCallback, useRef } from "react";

export function AuthCardWrap({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.removeProperty("--mouse-x");
    el.style.removeProperty("--mouse-y");
  }, []);

  return (
    <div
      className="auth-card-wrap"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={wrapRef}
    >
      {children}
    </div>
  );
}
