"use client";

import DotGrid from "@/blocks/Backgrounds/DotGrid/DotGrid";
import SpotlightCard from "@/blocks/Components/SpotlightCard/SpotlightCard";
import { AnimatedModalDemo } from "@/components/AnimatedModalDemo";
import { motion } from "motion/react";

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 배경 */}
      <div className="relative w-full h-[900px]">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#393055"
          activeColor="#5227FF"
          proximity={150}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />

        {/* 다크 오버레이 */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background: `radial-gradient(
              ellipse 700px 500px at center,
              transparent 0%,
              transparent 40%,
              rgba(0, 0, 0, 0.3) 65%,
              rgba(0, 0, 0, 0.7) 100%
            )`,
          }}
        />

        {/* 중앙 카드 */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pb-20">
          <SpotlightCard
            className="custom-spotlight-card w-[600px] h-[350px] rounded-2xl bg-black/90"
            spotlightColor="rgba(82, 39, 255, 0.25)"
          >
            <div className="flex h-full flex-col items-center justify-center gap-6">
              {/* 버튼 애니메이션 */}
              <motion.div
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <AnimatedModalDemo />
              </motion.div>
            </div>
          </SpotlightCard>
        </div>

        {/* 타이틀 + 서브타이틀 */}
        <div className="absolute left-1/2 top-[33%] -translate-x-1/2 z-40 w-full max-w-2xl px-6 text-center pointer-events-none">
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl font-bold tracking-tight leading-snug"
          >
            <span
              className="relative inline-block bg-gradient-to-r from-white to-[#A08CFF] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(82,39,255,0.35)] before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity before:duration-500 before:pointer-events-none hover:before:opacity-[0.03]"
            >
              Start project with partner
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-sm md:text-base text-white/80 leading-relaxed"
          >
            Every big idea starts with a conversation. <br />
            Find your co-founder today and turn vision into reality.
          </motion.p>
        </div>
      </div>
    </main>
  );
}