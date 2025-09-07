"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Users,
  Zap,
  Target,
  Sparkles,
  Brain,
  Heart,
  CheckCircle,
} from "lucide-react";

export default function MatchingLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [progress, setProgress] = useState(0);        // 화면에 보여줄 진행률(부드럽게 보간)
  const [currentStep, setCurrentStep] = useState(0);  // 0~4 (5단계)
  const [realProgress, setRealProgress] = useState(0); // 서버에서 받은 실제 진행률
  const [realStep, setRealStep] = useState<"embedding" | "calculating" | "ranking">("embedding");

  const steps = [
    { icon: Brain,    text: "Analyzing your profile...",       key: "embedding-1" },
    { icon: Target,   text: "Finding compatible partners...",  key: "calculating-1" },
    { icon: Zap,      text: "Calculating match scores...",     key: "calculating-2" },
    { icon: Users,    text: "Curating perfect matches...",     key: "ranking-1" },
    { icon: Sparkles, text: "Almost done...",                  key: "ranking-2" },
  ];

  // 실제 매칭 상태 polling
  useEffect(() => {
    // jobId가 없을 때: Fallback 가짜 진행
    if (!jobId) {
      const totalDuration = 7500;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += 50;
        const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
        setProgress(newProgress);

        // 5단계로 균등 매핑
        const idx = Math.min(steps.length - 1, Math.floor((newProgress / 100) * steps.length));
        setCurrentStep(idx);

        if (elapsed >= totalDuration) {
          clearInterval(timer);
          setTimeout(() => router.push("/find/results"), 500);
        }
      }, 50);

      return () => clearInterval(timer);
    }

    // jobId가 있을 때: 서버 진행률 폴링
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/matching/status/${jobId}`);
        const result = await response.json();

        if (!isMounted) return;

        if (result.success && result.data.job) {
          const job = result.data.job as {
            progress: number;
            currentStep: "embedding" | "calculating" | "ranking";
            status: "pending" | "processing" | "completed" | "failed";
            errorMessage?: string;
          };

          setRealProgress(job.progress);
          setRealStep(job.currentStep);

          // 진행률 + 단계에 따라 5단계로 매핑
          if (job.currentStep === "embedding") {
            setCurrentStep(0); // 0~ (아이콘 Brain)
          } else if (job.currentStep === "calculating") {
            if (job.progress < 50) {
              setCurrentStep(1); // Target
            } else {
              setCurrentStep(2); // Zap
            }
          } else if (job.currentStep === "ranking") {
            if (job.progress < 90) {
              setCurrentStep(3); // Users
            } else {
              setCurrentStep(4); // Sparkles
            }
          }

          if (job.status === "completed") {
            setTimeout(() => router.push("/find/results"), 800);
          } else if (job.status === "failed") {
            console.error("Matching failed:", job.errorMessage);
            setTimeout(() => router.push("/find/results"), 800);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch matching status:", error);
      }
    };

    // 첫 폴링 즉시 실행 + 1초 간격
    pollStatus();
    const statusInterval = setInterval(pollStatus, 1000);

    return () => {
      isMounted = false;
      clearInterval(statusInterval);
    };
  }, [jobId, router]);

  // 부드러운 진행률 보간(실제 진행률(realProgress)을 시각적 진행률(progress)로 스무딩)
  useEffect(() => {
    if (!jobId) return; // fallback 모드는 이미 자체 타이머로 진행
    const target = realProgress;
    const diff = target - progress;

    if (Math.abs(diff) < 1) {
      setProgress(target);
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        const step = (target - prev) / 10; // 10 단계 보간
        const next = prev + step;
        if (Math.abs(next - target) < 1) {
          clearInterval(timer);
          return target;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [realProgress, jobId, progress]);

  const displayProgress = Math.max(0, Math.min(100, progress));
  const displayStep = Math.max(0, Math.min(steps.length - 1, currentStep));

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Main Loading Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          {/* Central Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-32 h-32 mb-8 relative"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-md opacity-70" />
            <div className="relative w-full h-full rounded-full bg-black border-2 border-white/20 flex items-center justify-center">
              <Heart className="h-16 w-16 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
          >
            Finding Your Perfect
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent block">
              Co-Founder
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg text-white/70 mb-12 max-w-lg mx-auto"
          >
            {jobId
              ? "Our AI is analyzing your profile and finding the best matches"
              : "Our AI is analyzing thousands of profiles to find the best matches for your startup journey"}
          </motion.p>
        </motion.div>

        {/* Progress Section */}
        <div className="space-y-8">
          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 text-white/60 text-sm font-medium">
              {Math.round(displayProgress)}% complete
            </div>
          </div>

          {/* Current Step */}
          <motion.div
            key={displayStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 text-white/80"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {React.createElement(steps[displayStep]?.icon || Brain, {
                className: "h-6 w-6 text-blue-400",
              })}
            </motion.div>
            <span className="text-lg font-medium">
              {steps[displayStep]?.text || "Processing..."}
            </span>
          </motion.div>

          {/* Steps List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            {steps.map((step, index) => {
              const isCompleted = index < displayStep;
              const isCurrent = index === displayStep;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? "border-green-500/30 bg-green-500/10"
                      : isCurrent
                      ? "border-blue-500/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-green-500"
                        : isCurrent
                        ? "bg-blue-500"
                        : "bg-zinc-700"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      React.createElement(step.icon, {
                        className: `h-4 w-4 ${isCurrent ? "text-white" : "text-white/60"}`,
                      })
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? "text-green-400"
                        : isCurrent
                        ? "text-blue-400"
                        : "text-white/60"
                    }`}
                  >
                    {step.text}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Fun Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/10"
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-white">15K+</div>
              <div className="text-sm text-white/60">Active Founders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">2.3K</div>
              <div className="text-sm text-white/60">Successful Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">95%</div>
              <div className="text-sm text-white/60">Match Accuracy</div>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              animate={{
                x: [0, 30, -30, 0],
                y: [0, -30, 30, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeInOut",
              }}
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}