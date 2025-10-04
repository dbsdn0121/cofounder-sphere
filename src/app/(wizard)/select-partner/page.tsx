"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Users,
  Building2,
  Loader2,
  Lightbulb,
  Target,
  Clock,
  Heart,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/* ----------------------------- 데이터 정의 ----------------------------- */

const industryGroups: Record<string, string[]> = {
  "Technology": ["AI/Machine Learning", "DevTools", "Cybersecurity", "Cloud/Infrastructure", "Blockchain"],
  "Business & Finance": ["Fintech", "InsurTech", "HR/People", "LegalTech", "Enterprise SaaS"],
  "Education & Learning": ["EdTech", "Online Learning", "Skill Development", "Language Learning", "Assessment Tools"],
  "Healthcare & Wellness": ["Digital Health", "Telemedicine", "Mental Health", "Fitness Tech", "Medical Devices"],
  "Climate & Sustainability": ["Clean Energy", "Carbon Management", "Sustainable Living", "Green Transport", "Circular Economy"],
  "Commerce & Retail": ["E-commerce", "Social Commerce", "Supply Chain", "Consumer Apps", "Marketplaces"],
  "Entertainment & Media": ["Content Creation", "Gaming", "Social Media", "Streaming", "Creator Economy"],
  "Mobility & Transport": ["Urban Mobility", "Logistics", "Travel Tech", "Autonomous Systems", "Delivery Tech"],
};

const projectGoals = [
  "Launch MVP quickly",
  "Build long-term growth foundation",
  "Community building",
  "Learn through experimentation",
  "Create social impact",
  "Pursue technical innovation"
];

const partnerRoles = [
  "Developer/Engineer",
  "Designer (UI/UX)",
  "Product Manager",
  "Business/Marketing",
  "Data Scientist",
  "Domain Expert"
];

const partnerExpectations = [
  "Fast execution",
  "Creative ideas",
  "Deep domain knowledge",
  "Network/Sales ability",
  "Technical expertise",
  "Strategic thinking"
];

const collaborationStyles = [
  "Fast iterative execution",
  "Regular meetings (1-2x/week)",
  "Autonomous role division",
  "Deep discussion focused",
  "Data-driven decisions",
  "Intuitive and flexible approach"
];

const timeCommitments = [
  "Full-time (40+ hours/week)",
  "Part-time (20-30 hours/week)",
  "Side project (10-15 hours/week)",
  "Light involvement (5-10 hours/week)"
];

const teamCultures = [
  "Experimental and free",
  "Systematic and planned",
  "Small and agile",
  "Big picture oriented",
  "Data-driven",
  "User-centered"
];

/* 높이 애니메이션 안정값 */
const MIN_H = 420;




// ✅ 정규화 유틸 (배열/문자열 보정)
function normalizeArray(v: unknown): string[] {
  return Array.isArray(v) ? v : [];
}
function normalizeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}


/* ----------------------------- 메인 컴포넌트 ----------------------------- */

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // 진행 상태
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const total = 10; // Welcome + 9 project questions

  // 답변 상태
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [problemToSolve, setProblemToSolve] = useState("");
  const [noIdeaYet, setNoIdeaYet] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedPartnerRoles, setSelectedPartnerRoles] = useState<string[]>([]);
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [selectedCollaboration, setSelectedCollaboration] = useState<string[]>([]);
  const [selectedTimeCommitment, setSelectedTimeCommitment] = useState("");
  const [selectedCultures, setSelectedCultures] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [decideWithPartner, setDecideWithPartner] = useState(false);

  // 유틸 토글러
  const toggleIn = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  // 다음 버튼 활성화 조건
  const canNext = useMemo(() => {
    switch (step) {
      case 1: return true; // Welcome
      case 2: return selectedIndustries.length >= 1; // 산업 선택
      case 3: return noIdeaYet || problemToSolve.trim().length >= 10; // 문제 정의 또는 아직 아이디어 없음
      case 4: return selectedGoals.length >= 1; // 프로젝트 목표
      case 5: return selectedPartnerRoles.length >= 1; // 파트너 역할
      case 6: return selectedExpectations.length >= 1; // 파트너 기대사항
      case 7: return selectedCollaboration.length >= 1; // 협업 방식
      case 8: return selectedTimeCommitment.length > 0; // 시간 헌신
      case 9: return selectedCultures.length >= 1; // 팀 문화
      case 10: return decideWithPartner || projectName.trim().length >= 1; // 프로젝트 이름
      default: return true;
    }
  }, [step, selectedIndustries, problemToSolve, noIdeaYet, selectedGoals, selectedPartnerRoles, selectedExpectations, selectedCollaboration, selectedTimeCommitment, selectedCultures, projectName, decideWithPartner]);

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

  const goNext = async () => {
    if (!canNext) return;
    
    if (step < total) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      if (!user) {
        console.error("User not found");
        return;
      }

      setSaving(true);
      
      try {
  // (1) 프로젝트 중심 온보딩 데이터 정규화
  const projectPreferences = {
    industries: normalizeArray(selectedIndustries),
    problemToSolve: noIdeaYet ? "" : normalizeString(problemToSolve).trim(),
    noIdeaYet: !!noIdeaYet,
    goals: normalizeArray(selectedGoals),
    partnerRoles: normalizeArray(selectedPartnerRoles),
    expectations: normalizeArray(selectedExpectations),
    collaboration: normalizeArray(selectedCollaboration),
    timeCommitment: normalizeString(selectedTimeCommitment),
    teamCulture: normalizeArray(selectedCultures),
    projectName: decideWithPartner ? "" : normalizeString(projectName).trim(),
    decideWithPartner: !!decideWithPartner,
  };

  // (2) Clerk 메타(선택/UI용) 업데이트
  const headline =
    `${selectedIndustries[0] ? `Founder focused on ${selectedIndustries[0]}` : "Founder"}`
    + `${selectedGoals[0] ? ` with goal to ${selectedGoals[0]}` : ""}`;

  const profileData = {
    displayName: user.fullName || user.firstName || "",
    headline,
    role: "",
    skills: [],
    website: "",
    github: "",
    x: "",
    avatarUrl: "",
    status: "",
    workStyles: projectPreferences.collaboration,
    industries: projectPreferences.industries,
    vision: projectPreferences.noIdeaYet
      ? "Looking for co-founder to brainstorm ideas together"
      : projectPreferences.problemToSolve,
    qualities: projectPreferences.expectations,
    partnerTraits: projectPreferences.partnerRoles,
    currentProjects:
      projectPreferences.projectName && !projectPreferences.decideWithPartner
        ? [
            {
              name: projectPreferences.projectName,
              description: projectPreferences.noIdeaYet
                ? "Project idea to be developed"
                : projectPreferences.problemToSolve,
              status: "Planning" as const,
              links: [],
            },
          ]
        : [],
    completedProjects: [],
    projectPreferences,
    onboardingCompleted: true,
    onboardingCompletedAt: new Date().toISOString(),
  };

  // Clerk(선택)
  await user.update({ unsafeMetadata: profileData });

  // (3) Supabase에 preferences 저장 (서버 라우트 호출)
  const saveRes = await fetch("/api/profile/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectPreferences,
      onboardingCompleted: true,
      onboardingCompletedAt: profileData.onboardingCompletedAt,
    }),
  });
  const saveJson = await saveRes.json();
  if (!saveRes.ok || !saveJson?.success) {
    throw new Error(saveJson?.error || "Failed to save preferences to Supabase");
  }

  // (4) 매칭 시작
  const response = await fetch("/api/matching/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json();

  if (result.success) {
    router.push(`/find/loading?`);
  } else {
    throw new Error(result.error || "Failed to start matching");
  }
} catch (matchingError) {
  console.error("Failed to start matching:", matchingError);
  // 매칭 시작 실패해도 로딩 페이지로 이동 (fallback)
  router.push("/find/loading");
} finally {
    setSaving(false); // ✅ 반드시 복구
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
          backgroundImage: "url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2400&auto=format&fit=crop)",
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
                  {idx < total && <div className="h-px w-6 bg-white/25" />}
                </div>
              );
            })}
          </div>

          {/* 카드 */}
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
            {/* 헤더 아이콘 */}
            <div className="px-8 pt-8">
              <div className={
                "mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.25)] " +
                (step === 1 ? "mt-10" : "")
              }>
                {step === 1 ? <Building2 className="h-7 w-7 text-white/90" /> : 
                 step <= 3 ? <Lightbulb className="h-7 w-7 text-white/90" /> :
                 step <= 6 ? <Users className="h-7 w-7 text-white/90" /> :
                 step <= 9 ? <Target className="h-7 w-7 text-white/90" /> :
                 <Heart className="h-7 w-7 text-white/90" />}
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
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                      <div className="mt-6">
                        <StepWrap title="Welcome to CoFounderSphere!" subtitle="Find the perfect partner for your next project">
                          <div className="mx-auto mt-6 max-w-xl">
                            <p className="text-center text-white/70">Preparing your project-focused onboarding…</p>
                          </div>
                        </StepWrap>
                      </div>
                    )}

                    {/* Step 2: 산업 선택 */}
                    {step === 2 && (
                      <div className="h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                        <StepWrap title="Which industry would you like to start a new project in?" subtitle="Select the industries that excite you most.">
                          <SectionedChipGroup groups={industryGroups} selected={selectedIndustries} onToggle={toggleIn(setSelectedIndustries)} />
                        </StepWrap>
                      </div>
                    )}

                    {/* Step 3: 해결하고 싶은 문제 */}
                    {step === 3 && (
                      <StepWrap title="What problem do you want to solve?" subtitle="Describe the specific problem or need you'd like to address.">
                        <div className="mx-auto mt-6 max-w-xl">
                          <div className="flex items-start gap-3 mb-4">
                            <input
                              id="noIdeaYet"
                              type="checkbox"
                              checked={noIdeaYet}
                              onChange={(e) => {
                                setNoIdeaYet(e.target.checked);
                                if (e.target.checked) {
                                  setProblemToSolve("");
                                }
                              }}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 transition-all duration-300 cursor-pointer accent-white"
                            />
                            <label htmlFor="noIdeaYet" className="text-sm text-white/85 cursor-pointer">
                              I don&apos;t have a specific idea yet - I want to brainstorm with a partner
                            </label>
                          </div>

                          <textarea
                            value={problemToSolve}
                            onChange={(e) => setProblemToSolve(e.target.value)}
                            placeholder="Example: Students struggle with time management and need help creating efficient study plans."
                            rows={6}
                            disabled={noIdeaYet}
                            className={
                              "w-full resize-none rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 text-white " +
                              (noIdeaYet
                                ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                : "border-white/15 bg-black/35 focus:border-white/40 focus:bg-black/50")
                            }
                          />
                          {!noIdeaYet && (
                            <p className="mt-2 text-right text-xs text-white/50">{problemToSolve.trim().length} characters</p>
                          )}
                          
                          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            {noIdeaYet ? (
                              <>
                                <p className="text-sm text-white/60 mb-2">💡 Perfect for:</p>
                                <ul className="text-xs text-white/50 space-y-1">
                                  <li>• Finding a co-founder to explore ideas together</li>
                                  <li>• Leveraging diverse perspectives for innovation</li>
                                  <li>• Building something from scratch collaboratively</li>
                                </ul>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-white/60 mb-2">💡 Good examples:</p>
                                <ul className="text-xs text-white/50 space-y-1">
                                  <li>• &quot;Small businesses can&apos;t effectively use their data&quot;</li>
                                  <li>• &quot;College students face information gaps in job preparation&quot;</li>
                                  <li>• &quot;Developers waste too much time on code reviews&quot;</li>
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      </StepWrap>
                    )}

                    {/* Step 4: 프로젝트 목표 */}
                    {step === 4 && (
                      <StepWrap title="What are your project goals?" subtitle="Choose how you'd like to approach this project.">
                        <ChipGroup items={projectGoals} selected={selectedGoals} onToggle={toggleIn(setSelectedGoals)} />
                      </StepWrap>
                    )}

                    {/* Step 5: 원하는 파트너의 역할 */}
                    {step === 5 && (
                      <StepWrap title="What kind of partner are you looking for?" subtitle="Select the expertise you'd like your partner to bring.">
                        <ChipGroup items={partnerRoles} selected={selectedPartnerRoles} onToggle={toggleIn(setSelectedPartnerRoles)} />
                      </StepWrap>
                    )}

                    {/* Step 6: 파트너에게 기대하는 것 */}
                    {step === 6 && (
                      <StepWrap title="What do you value most in a partner?" subtitle="Choose the qualities that matter most to you.">
                        <ChipGroup items={partnerExpectations} selected={selectedExpectations} onToggle={toggleIn(setSelectedExpectations)} />
                      </StepWrap>
                    )}

                    {/* Step 7: 협업 방식 */}
                    {step === 7 && (
                      <StepWrap title="How would you like to collaborate?" subtitle="Choose your preferred working style.">
                        <ChipGroup items={collaborationStyles} selected={selectedCollaboration} onToggle={toggleIn(setSelectedCollaboration)} />
                      </StepWrap>
                    )}

                    {/* Step 8: 시간/헌신 수준 */}
                    {step === 8 && (
                      <StepWrap title="How much time can you commit to this project?" subtitle="Select your availability level.">
                        <div className="mx-auto flex max-w-2xl flex-col gap-3">
                          {timeCommitments.map((commitment, index) => (
                            <motion.button
                              key={commitment}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => setSelectedTimeCommitment(commitment)}
                              className={
                                "w-full rounded-xl border px-4 py-3 text-left transition-all duration-300 cursor-pointer " +
                                (selectedTimeCommitment === commitment
                                  ? "border-white bg-white text-black scale-105"
                                  : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 opacity-70" />
                                <span className="font-medium">{commitment}</span>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </StepWrap>
                    )}

                    {/* Step 9: 팀 문화/분위기 */}
                    {step === 9 && (
                      <StepWrap title="What kind of team culture do you want?" subtitle="Choose your ideal team atmosphere.">
                        <ChipGroup items={teamCultures} selected={selectedCultures} onToggle={toggleIn(setSelectedCultures)} />
                      </StepWrap>
                    )}

                    {/* Step 10: 프로젝트 이름 */}
                    {step === 10 && (
                      <StepWrap title="What would you name your project idea?" subtitle="Give your project a temporary name or codename.">
                        <div className="mx-auto mt-6 max-w-xl">
                          <div className="flex items-start gap-3 mb-4">
                            <input
                              id="decideWithPartner"
                              type="checkbox"
                              checked={decideWithPartner}
                              onChange={(e) => setDecideWithPartner(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 transition-all duration-300 cursor-pointer accent-white"
                            />
                            <label htmlFor="decideWithPartner" className="text-sm text-white/85 cursor-pointer">
                              I&apos;ll decide with my partner later
                            </label>
                          </div>

                          <input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. StudyBuddy, DataBridge, CodeReview AI..."
                            disabled={decideWithPartner}
                            className={
                              "w-full rounded-2xl border px-4 py-3 outline-none placeholder:text-white/40 transition-all duration-300 text-white " +
                              (decideWithPartner
                                ? "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
                                : "border-white/15 bg-black/35 focus:border-white/40 focus:bg-black/50")
                            }
                          />

                          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-sm text-white/60 mb-2">💡 Tip:</p>
                            <p className="text-xs text-white/50">
                              Don&apos;t worry about the perfect name. A simple name that captures the core of your project is enough.
                            </p>
                          </div>
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
                <span className="text-white font-medium">Creating your project profile...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------------------- UI 헬퍼 컴포넌트들 ----------------------------- */

function StepWrap({ title, subtitle, children }: {
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
        className="text-center text-2xl sm:text-3xl font-extrabold text-white leading-tight"
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

function ChipGroup({ items, selected, onToggle }: {
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
              (on
                ? "border-white bg-white text-black scale-105"
                : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
            }
          >
            {s}
          </motion.button>
        );
      })}
    </div>
  );
}

function SectionedChipGroup({ groups, selected, onToggle }: {
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
                    (on
                      ? "border-white bg-white text-black scale-105"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105")
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