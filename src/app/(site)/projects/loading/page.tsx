"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Brain, text: "Analyzing your profile...", duration: 1500 },
    { icon: Target, text: "Finding compatible partners...", duration: 2000 },
    { icon: Zap, text: "Calculating match scores...", duration: 1800 },
    { icon: Users, text: "Curating perfect matches...", duration: 1200 },
    { icon: Sparkles, text: "Almost done...", duration: 800 },
  ];

  useEffect(() => {
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update current step
      let stepTime = 0;
      for (let i = 0; i < steps.length; i++) {
        stepTime += steps[i].duration;
        if (elapsed <= stepTime) {
          setCurrentStep(i);
          break;
        }
      }

      // Complete and redirect
      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setTimeout(() => {
          router.push('/projects/results');
        }, 500);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />
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
            Our AI is analyzing thousands of profiles to find the best matches for your startup journey
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
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 text-white/60 text-sm font-medium">
              {Math.round(progress)}% complete
            </div>
          </div>

          {/* Current Step */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 text-white/80"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {React.createElement(steps[currentStep]?.icon || Brain, {
                className: "h-6 w-6 text-blue-400"
              })}
            </motion.div>
            <span className="text-lg font-medium">
              {steps[currentStep]?.text || "Processing..."}
            </span>
          </motion.div>

          {/* Steps List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <motion.div
                  key={index}
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
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                      ? "bg-blue-500"
                      : "bg-zinc-700"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      React.createElement(step.icon, {
                        className: `h-4 w-4 ${isCurrent ? "text-white" : "text-white/60"}`
                      })
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isCompleted
                      ? "text-green-400"
                      : isCurrent
                      ? "text-blue-400"
                      : "text-white/60"
                  }`}>
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