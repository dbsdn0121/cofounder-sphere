"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Users,
  Building2,
  Link as LinkIcon,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/* ----------------------------- 데이터 정의 ----------------------------- */

type Role = "Developer" | "Designer" | "Product" | "Biz/Marketing";

const industryGroups: Record<string, string[]> = {
  Technology: ["AI/Machine Learning", "DevTools", "Cybersecurity", "Cloud/Infrastructure", "Blockchain"],
  "Business & Finance": ["Fintech", "InsurTech", "HR/People", "LegalTech", "Enterprise SaaS"],
  "Education & Learning": ["EdTech", "Online Learning", "Skill Development", "Language Learning", "Assessment Tools"],
  "Healthcare & Wellness": ["Digital Health", "Telemedicine", "Mental Health", "Fitness Tech", "Medical Devices"],
  "Climate & Sustainability": ["Clean Energy", "Carbon Management", "Sustainable Living", "Green Transport", "Circular Economy"],
  "Commerce & Retail": ["E-commerce", "Social Commerce", "Supply Chain", "Consumer Apps", "Marketplaces"],
  "Entertainment & Media": ["Content Creation", "Gaming", "Social Media", "Streaming", "Creator Economy"],
  "Productivity & Work": ["Collaboration Tools", "Automation", "Project Management", "Knowledge Tools", "SaaS"],
  "Mobility & Transportation": ["EV & Battery", "Autonomous Driving", "Urban Mobility", "Logistics Mobility", "TravelTech"],
  "Social Impact & Civic": ["GovTech", "Non-profit Tech", "Civic Tech", "Social Impact", "Diversity & Inclusion"],
};

const skillPool = ["AI/ML", "Frontend", "Backend", "Mobile", "Data", "DevOps", "UI", "UX", "Growth", "Sales"];
const workStylePool = ["Fast execution", "Detail-oriented", "Brainstorming", "Data-driven", "Independent", "Collaborative"];
const qualitiesPool = [
  "Commitment",
  "Technical expertise",
  "Creativity",
  "Leadership",
  "Communication",
  "Reliability",
  "Growth mindset",
  "Problem-solving",
];

const partnerTraitsPool = [
  "Experienced founder",
  "First-time founder",
  "Technical builder",
  "Product-focused",
  "Business-driven",
  "Creative problem solver",
  "Strong communicator",
  "Vision-oriented",
  "Hands-on operator",
  "Flexible collaborator",
  "Design-minded",
  "Marketing-oriented",
  "Sales-driven",
  "Networked connector",
  "Domain expert",
  "Global mindset",
];

/* 높이 애니메이션 안정값 */
const MIN_H = 420;

/* ----------------------------- 메인 컴포넌트 ----------------------------- */

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  // ✅ Clerk JWT를 주입한 브라우저 Supabase 클라이언트 (RLS 호환)
  const supabase = useMemo(
    () => createBrowserSupabase((args) => getToken({ template: "supabase", ...args })),
    [getToken]
  );

  // 진행 상태
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const total = 11;

  // 답변 상태
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"Student" | "Employee" | "Freelancer" | "Entrepreneur" | "">("");
  const [skills, setSkills] = useState<string[]>([]);
  const [partnerTraits, setPartnerTraits] = useState<string[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [workStyles, setWorkStyles] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [vision, setVision] = useState("");
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [currentIdea, setCurrentIdea] = useState("");
  const [decideWithPartner, setDecideWithPartner] = useState(false);
  const [previousProjectName, setPreviousProjectName] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [projectLinks, setProjectLinks] = useState<string[]>([""]);
  const [noPrevProjects, setNoPrevProjects] = useState(false);
  const [qualities, setQualities] = useState<string[]>([]);
  const [oneLiner, setOneLiner] = useState("");

  // 유틸 토글러
  const toggleIn =
    (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
      set((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  // 링크 편집
  const addLink = () => setProjectLinks((prev) => [...prev, ""]);
  const updateLink = (idx: number, val: string) => setProjectLinks((prev) => prev.map((v, i) => (i === idx ? val : v)));
  const removeLink = (idx: number) => setProjectLinks((prev) => prev.filter((_, i) => i !== idx));

  // 다음 버튼 활성화 조건
  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return name.trim().length >= 1 && !!status;
      case 3:
        return skills.length >= 2;
      case 4:
        return partnerTraits.length >= 1;
      case 5:
        return !!role;
      case 6:
        return workStyles.length >= 1;
      case 7:
        return industries.length >= 1;
      case 8:
        return vision.trim().length >= 20;
      case 9:
        return decideWithPartner || currentIdea.trim().length >= 10 || currentProjectName.trim().length >= 1;
      case 10: {
        if (noPrevProjects) return true;
        const validLinks = projectLinks.map((s) => s.trim()).filter(Boolean);
        return projectSummary.trim().length >= 10 || validLinks.length > 0 || previousProjectName.trim().length >= 1;
      }
      case 11:
        return qualities.length >= 1 && oneLiner.trim().length >= 5;
      default:
        return true;
    }
  }, [
    step,
    name,
    status,
    skills,
    partnerTraits,
    role,
    workStyles,
    industries,
    vision,
    decideWithPartner,
    currentIdea,
    currentProjectName,
    noPrevProjects,
    projectSummary,
    projectLinks,
    previousProjectName,
    qualities,
    oneLiner,
  ]);

  // step1 자동 진행
  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => {
        setDirection(1);
        setStep(2);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  // 사용자 이름 자동 설정
  useEffect(() => {
    if (isLoaded && user && !name) {
      setName(user.fullName || user.firstName || "");
    }
  }, [isLoaded, user, name]);

  const goNext = async () => {
    if (!canNext) return;

    if (step < total) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      // 마지막 스텝 - 실제 데이터베이스에 저장
      if (!user) {
        console.error("User not found");
        return;
      }

      setSaving(true);

      try {
        // 1) 프로필 upsert
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .upsert(
            [
              {
                clerk_user_id: user.id, // Clerk ID 연결
                display_name: name.trim(),
                headline: oneLiner.trim() || vision.slice(0, 100).trim(),
                role: role || "",
                status: status || "",
                skills: skills.filter(Boolean),
                work_styles: workStyles.filter(Boolean),
                industries: industries.filter(Boolean),
                vision: vision.trim(),
                qualities: qualities.filter(Boolean),
                partner_traits: partnerTraits.filter(Boolean),
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
              },
            ],
            { onConflict: "clerk_user_id" }
          )
          .select()
          .single();

        if (profileError) {
          console.error("프로필 저장 오류:", profileError);
          throw profileError;
        }

        // 2) 현재 프로젝트 저장 (선택)
        if (!decideWithPartner && (currentIdea.trim() || currentProjectName.trim())) {
          const { error: currentProjectError } = await supabase.from("current_projects").insert([
            {
              user_id: profile.id,
              name: currentProjectName.trim() || "Current Project",
              description: currentIdea.trim(),
              status: "In Progress",
            },
          ]);

          if (currentProjectError) {
            console.error("현재 프로젝트 저장 오류:", currentProjectError);
          }
        }

        // 3) 완료 프로젝트 저장 (선택)
        if (!noPrevProjects && (projectSummary.trim() || previousProjectName.trim())) {
          const { error: completedProjectError } = await supabase.from("completed_projects").insert([
            {
              user_id: profile.id,
              name: previousProjectName.trim() || "Previous Project",
              description: projectSummary.trim(),
              links: projectLinks.map((link) => link.trim()).filter(Boolean),
            },
          ]);

          if (completedProjectError) {
            console.error("완료된 프로젝트 저장 오류:", completedProjectError);
          }
        }

        // 4) Clerk metadata 업데이트 (선택)
        await user.update({
          unsafeMetadata: {
            onboardingCompleted: true,
            profileId: profile.id,
            supabaseSync: true,
          },
        });

        // 완료 이동
        router.push("/find");
      } catch (error) {
        console.error("온보딩 저장 실패:", error);
        alert("프로필 저장에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setSaving(false);
      }
    }
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  };

  // 높이 측정 & 애니메이션
  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number>(MIN_H);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      setMeasured(Math.max(h, MIN_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="flex items-center gap-2 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 커스텀 스크롤바 스타일 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          transition: background-color 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
        }
      `}</style>

      <div
        className="relative min-h-screen w-full"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2400&auto=format&fit=crop)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-10">
          {/* 진행 점 */}
          <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between px-0">
            {Array.from({ length: total }).map((_, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <motion.span
                    layout
                    transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                    className={
                      "grid place-items-center h-6 w-6 rounded-full text-[10px] " +
                      (done ? "bg-white text-black" : active ? "bg-white/90 text-black" : "bg-white/25 text-white/70")
                    }
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : idx}
                  </motion.span>
                  {idx < total && <div className="h-px w-8 bg-white/25" />}
                </div>
              );
            })}
          </div>

          {/* 카드 */}
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
            {/* 헤더 아이콘 */}
            <div className="px-8 pt-8">
              <div
                className={
                  "mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.25)] " +
                  (step === 1 ? "mt-10" : "")
                }
              >
                {step === 1 ? <Building2 className="h-7 w-7 text-white/90" /> : <Users className="h-7 w-7 text-white/90" />}
              </div>
            </div>

            {/* 높이 애니메이션 래퍼 */}
            <motion.div
              className="px-8"
              animate={{ height: measured }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div ref={measureRef}>
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.div
                    key={step}
                    custom={direction}
                    initial={{
                      opacity: 0,
                      x: direction === 1 ? 60 : -60,
                      filter: "blur(12px)",
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      filter: "blur(0px)",
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: direction === 1 ? -60 : 60,
                      filter: "blur(12px)",
                      scale: 0.95,
                    }}
                    transition={{
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                      opacity: { duration: 0.6 },
                      filter: { duration: 0.6 },
                      scale: { duration: 0.6 },
                    }}
                  >
                    {/* step 1: Welcome */}
                    {step === 1 && (
                      <div className="mt-6">
                        <StepWrap title="Welcome to CoFounderSphere!" subtitle="Let's start with some questions">
                          <div className="mx-auto mt-6 max-w-xl">
                            <p className="text-center text-white/70">Preparing your onboarding…</p>
                          </div>
                        </StepWrap>
                      </div>
                    )}

                    {/* step 2: 기본정보 */}
                    {step === 2 && (
                      <StepWrap title="Tell us about yourself" subtitle="Just the basics so others know who you are.">
                        <div className="mx-auto mt-6 grid max-w-xl gap-5">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white/85">Name / Nickname</label>
                            <input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Alex Smith"
                              className="w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/40 transition-all duration-300 focus:border-white/40 focus:bg-black/50"
                            />
                          </div>

                          <div>
                            <div className="mb-2 text-sm font-semibold text-white/85">Current status</div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {(["Student", "Employee", "Freelancer", "Entrepreneur"] as const).map((s) => {
                                const on = status === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={
                                      "min-h-[48px] rounded-xl border px-3 py-3 text-sm transition-all duration-300 cursor-pointer " +
                                      (on
                                        ? "border-white bg-white text-black scale-105"
                                        : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
                                    }
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </StepWrap>
                    )}

                    {/* step 3: 스킬 */}
                    {step === 3 && (
                      <StepWrap
                        title="What skills can you bring to a startup team?"
                        subtitle="Pick at least 2 that represent your strengths."
                      >
                        <ChipGroup items={skillPool} selected={skills} onToggle={toggleIn(setSkills)} />
                        <p className="mt-3 text-center text-xs text-white/60">{skills.length} selected</p>
                      </StepWrap>
                    )}

                    {/* step 4: 나의 특징 */}
                    {step === 4 && (
                      <StepWrap
                        title="What describes you best as a potential co-founder?"
                        subtitle="Select the characteristics that represent your strengths and experience."
                      >
                        <ChipGroup items={partnerTraitsPool} selected={partnerTraits} onToggle={toggleIn(setPartnerTraits)} />
                        <p className="mt-3 text-center text-xs text-white/60">{partnerTraits.length} selected</p>
                      </StepWrap>
                    )}

                    {/* step 5: 역할 */}
                    {step === 5 && (
                      <StepWrap title="Which role fits you best?" subtitle="Select your primary role in a startup team.">
                        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                          {(["Developer", "Designer", "Product", "Biz/Marketing"] as Role[]).map((r) => {
                            const selected = role === r;
                            return (
                              <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={
                                  "rounded-xl border px-3 py-4 text-sm transition-all duration-300 min-h-[64px] cursor-pointer " +
                                  (selected
                                    ? " border-white bg-white text-black transform scale-105"
                                    : " border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
                                }
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </StepWrap>
                    )}

                    {/* step 6: 협업 스타일 */}
                    {step === 6 && (
                      <StepWrap title="How do you prefer to collaborate?" subtitle="Choose styles that feel natural to you.">
                        <ChipGroup items={workStylePool} selected={workStyles} onToggle={toggleIn(setWorkStyles)} />
                      </StepWrap>
                    )}

                    {/* step 7: 산업 선택 */}
                    {step === 7 && (
                      <div className="h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                        <StepWrap
                          title="What industries are you excited about?"
                          subtitle="Pick one or more areas you'd love to build in."
                        >
                          <SectionedChipGroup groups={industryGroups} selected={industries} onToggle={toggleIn(setIndustries)} />
                        </StepWrap>
                      </div>
                    )}

                    {/* step 8: 비전/동기 */}
                    {step === 8 && (
                      <StepWrap
                        title="Why do you want to start a company?"
                        subtitle="Share your motivation or long-term vision (20+ chars)."
                      >
                        <div className="mx-auto mt-6 max-w-xl">
                          <textarea
                            value={vision}
                            onChange={(e) => setVision(e.target.value)}
                            placeholder="e.g. Build tools that empower students with AI, scale globally while keeping simple UX..."
                            rows={6}
                            className="w-full resize-none rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/40 transition-all duration-300 focus:border-white/40 focus:bg-black/50"
                          />
                          <p className="mt-2 text-right text-xs text-white/50">{vision.trim().length} chars</p>
                        </div>
                      </StepWrap>
                    )}

                    {/* step 9: 현재 아이디어/계획 */}
                    {step === 9 && (
                      <StepWrap title="Do you have a current idea or plan?" subtitle="Write a short pitch or skip if undecided.">
                        <div className="mx-auto mt-6 max-w-xl">
                          <label className="mb-2 block text-sm font-semibold text-white/85">
                            Project / Business Name (optional)
                          </label>
                          <input
                            value={currentProjectName}
                            onChange={(e) => setCurrentProjectName(e.target.value)}
                            placeholder="e.g. CoFounderSphere"
                            disabled={decideWithPartner}
                            className={
                              "w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 text-white " +
                              (decideWithPartner
                                ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                : "border-white/15 bg-black/35 focus:border-white/40 focus:bg-black/50")
                            }
                          />

                          <div className="mt-4 flex items-start gap-3">
                            <input
                              id="decideWithPartner"
                              type="checkbox"
                              checked={decideWithPartner}
                              onChange={(e) => setDecideWithPartner(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 transition-all duration-300 cursor-pointer"
                            />
                            <label htmlFor="decideWithPartner" className="text-sm text-white/85 cursor-pointer">
                              I&apos;ll decide with my partner
                            </label>
                          </div>

                          <textarea
                            value={currentIdea}
                            onChange={(e) => setCurrentIdea(e.target.value)}
                            placeholder="Short pitch about your current idea..."
                            rows={5}
                            disabled={decideWithPartner}
                            className={
                              "mt-4 w-full resize-none rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 " +
                              (decideWithPartner
                                ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                : "border-white/15 bg-black/35 text-white focus:border-white/40 focus:bg-black/50")
                            }
                          />
                          <p className="mt-2 text-right text-xs text-white/50">{currentIdea.trim().length} chars</p>
                        </div>
                      </StepWrap>
                    )}

                    {/* step 10: 과거 프로젝트 */}
                    {step === 10 && (
                      <div className="h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                        <StepWrap
                          title="Have you worked on projects before?"
                          subtitle="Add a short summary or links. If none, check the box."
                        >
                          <div className="mx-auto mt-6 max-w-xl">
                            <div className="flex items-start gap-3">
                              <input
                                id="noPrevProjects"
                                type="checkbox"
                                checked={noPrevProjects}
                                onChange={(e) => setNoPrevProjects(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 transition-all duration-300 cursor-pointer"
                              />
                              <label htmlFor="noPrevProjects" className="text-sm text-white/85 cursor-pointer">
                                No previous projects
                              </label>
                            </div>

                            <label className="mt-4 mb-2 block text-sm font-semibold text-white/85">Project Name (optional)</label>
                            <input
                              value={previousProjectName}
                              onChange={(e) => setPreviousProjectName(e.target.value)}
                              placeholder="e.g. NotePilot"
                              disabled={noPrevProjects}
                              className={
                                "w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 " +
                                (noPrevProjects
                                  ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                  : "border-white/15 bg-black/35 text-white focus:border-white/40 focus:bg-black/50")
                              }
                            />

                            <textarea
                              value={projectSummary}
                              onChange={(e) => setProjectSummary(e.target.value)}
                              placeholder="e.g. Built an AI note-taking app with 2K users; led backend & infra."
                              rows={4}
                              disabled={noPrevProjects}
                              className={
                                "mt-4 w-full resize-none rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 " +
                                (noPrevProjects
                                  ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                  : "border-white/15 bg-black/35 text-white focus:border-white/40 focus:bg-black/50")
                              }
                            />

                            {/* 링크 리스트 */}
                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-semibold text-white/85">Project links</label>
                              <div className="space-y-2">
                                {projectLinks.map((link, idx) => (
                                  <div
                                    key={idx}
                                    className={
                                      "flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all duration-300 " +
                                      (noPrevProjects
                                        ? "border-white/10 bg-black/20"
                                        : "border-white/15 bg-black/35 focus-within:border-white/40 focus-within:bg-black/50")
                                    }
                                  >
                                    <LinkIcon className="h-4 w-4 text-white/60 shrink-0" />
                                    <input
                                      value={link}
                                      onChange={(e) => updateLink(idx, e.target.value)}
                                      placeholder="https://github.com/...  https://demo.yourapp.com"
                                      disabled={noPrevProjects}
                                      className={
                                        "flex-1 bg-transparent outline-none placeholder:text-white/40 transition-all duration-300 " +
                                        (noPrevProjects ? "text-white/40" : "text-white")
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeLink(idx)}
                                      disabled={noPrevProjects || projectLinks.length === 1}
                                      className={
                                        "rounded-md p-1.5 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed " +
                                        (noPrevProjects || projectLinks.length === 1
                                          ? "text-white/30"
                                          : "text-white/70 hover:bg-white/10 hover:scale-110")
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={addLink}
                                disabled={noPrevProjects}
                                className={
                                  "mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-300 cursor-pointer disabled:cursor-not-allowed " +
                                  (noPrevProjects
                                    ? "border-white/10 text-white/40"
                                    : "border-white/20 text-white hover:bg-white/10 hover:scale-105")
                                }
                              >
                                <Plus className="h-4 w-4" />
                                Add link
                              </button>
                            </div>

                            <div className="mt-3 text-right text-xs text-white/50">
                              {projectSummary.trim().length} chars • {projectLinks.map((s) => s.trim()).filter(Boolean).length} link(s)
                            </div>
                          </div>
                        </StepWrap>
                      </div>
                    )}

                    {/* step 11: 자질 + 한줄소개 */}
                    {step === 11 && (
                      <StepWrap
                        title="What qualities do you value most in a co-founder?"
                        subtitle="Pick traits and write a short one-line intro."
                      >
                        <ChipGroup items={qualitiesPool} selected={qualities} onToggle={toggleIn(setQualities)} />
                        <div className="mx-auto mt-6 max-w-xl">
                          <label className="mb-2 block text-sm font-semibold text-white/85">One-line introduction</label>
                          <input
                            value={oneLiner}
                            onChange={(e) => setOneLiner(e.target.value)}
                            placeholder='e.g. "AI-loving execution-focused high school developer"'
                            className="w-full rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/40 transition-all duration-300 focus:border-white/40 focus:bg-black/50"
                          />
                          <p className="mt-2 text-right text-xs text-white/50">{oneLiner.trim().length} chars</p>
                        </div>
                      </StepWrap>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* 푸터 내비 버튼 */}
            <div className="px-8 pb-8 pt-6 flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={goPrev}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step > 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canNext || saving}
                  className={
                    "inline-flex items-center gap-2 rounded-xl px-5 py-2 font-semibold transition-all duration-300 cursor-pointer disabled:cursor-not-allowed " +
                    (canNext && !saving ? "bg-white text-black hover:bg-gray-100 hover:scale-105" : "bg-white/30 text-black/60")
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : step < total ? (
                    <>
                      Next <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    "Complete →"
                  )}
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>

          {/* 저장 중일 때 오버레이 */}
          {saving && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span className="text-white font-medium">Creating your profile...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------------------- UI 헬퍼 컴포넌트들 ----------------------------- */

function StepWrap({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center text-3xl sm:text-4xl font-extrabold text-white"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-center text-base sm:text-lg text-white/70 max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6"
      >
        {children}
      </motion.div>
    </div>
  );
}

function ChipGroup({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
      {items.map((s, index) => {
        const on = selected.includes(s);
        return (
          <motion.button
            key={s}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onToggle(s)}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-all duration-300 cursor-pointer " +
              (on ? "border-white bg-white text-black scale-105" : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
            }
          >
            {s}
          </motion.button>
        );
      })}
    </div>
  );
}

function SectionedChipGroup({
  groups,
  selected,
  onToggle,
}: {
  groups: Record<string, string[]>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      {Object.entries(groups).map(([section, items], sectionIndex) => (
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: sectionIndex * 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: sectionIndex * 0.1 + 0.2 }}
            className="mb-3 text-sm font-semibold text-white/80"
          >
            {section}
          </motion.div>
          <div className="flex flex-wrap gap-2">
            {items.map((s, itemIndex) => {
              const on = selected.includes(s);
              return (
                <motion.button
                  key={s}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: sectionIndex * 0.1 + itemIndex * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={() => onToggle(s)}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition-all duration-300 cursor-pointer " +
                    (on ? "border-white bg-white text-black scale-105" : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
                  }
                >
                  {s}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-1 text-right text-xs text-white/60"
      >
        {selected.length} selected
      </motion.p>
    </div>
  );
}
