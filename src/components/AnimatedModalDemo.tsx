"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function AnimatedModalDemo() {
  const router = useRouter();
  const [flash, setFlash] = useState(false);
  
  const handleClick = () => {
    // 번쩍 효과 실행
    setFlash(true);
    setTimeout(() => setFlash(false), 300); // 0.3초 후 제거
    router.push("/select-partner");
  };
  
  return (
    <div className="pt-110 pb-64 flex items-center justify-center">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Find your co-founder partner"
        className={[
          "relative flex items-center justify-center overflow-hidden",
          "rounded-md px-6 py-3",
          "bg-black text-white dark:bg-white dark:text-black",
          "transition-all duration-200",
          "hover:bg-neutral-800 dark:hover:bg-neutral-200",
          "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
          "hover:ring-1 hover:ring-white/15 dark:hover:ring-black/15",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-indigo-500/70 dark:focus-visible:ring-indigo-400/70",
          "group/modal-btn",
          "cursor-pointer", // 손모양 커서 추가
        ].join(" ")}
      >
        {/* 상단 하이라이트 */}
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-x-0 top-0 h-1/2",
            "bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]",
            "opacity-50 transition-opacity duration-200",
            "group-hover/modal-btn:opacity-70",
          ].join(" ")}
        />
        {/* 기본 텍스트 */}
        <span className="z-10 text-center transition-transform duration-250 group-hover/modal-btn:translate-x-40">
          Find your partner
        </span>
        {/* 호버 시 앞으로 오는 텍스트 */}
        <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition-transform duration-250 z-20">
          INSTANTLY
        </div>
        {/* 클릭 순간 반짝 효과 */}
        {flash && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md bg-white/40 dark:bg-black/40 animate-ping"
          />
        )}
      </button>
    </div>
  );
}