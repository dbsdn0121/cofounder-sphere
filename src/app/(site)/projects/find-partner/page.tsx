"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Target,
  Clock,
  MapPin,
  Star,
  Briefcase,
  Loader2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Partner preferences type
type PartnerPreferences = {
  projectId: string;
  projectName: string;
  lookingFor: string[];
  skills: string[];
  experience: string;
  availability: string;
  location: string;
  workStyle: string[];
  commitment: string;
  priorities: string[];
  additionalInfo: string;
};

export default function PartnerFinderOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const total = 6;

  // Get project info from URL params
  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || 'Your Project';

  // Form state
  const [preferences, setPreferences] = useState<PartnerPreferences>({
    projectId,
    projectName,
    lookingFor: [],
    skills: [],
    experience: "any",
    availability: "part-time",
    location: "remote",
    workStyle: [],
    commitment: "flexible",
    priorities: [],
    additionalInfo: "",
  });

  // Options
  const roleOptions = [
    "Frontend Developer",
    "Backend Developer", 
    "Full-stack Developer",
    "UI/UX Designer",
    "Product Manager",
    "Marketing Specialist",
    "Data Scientist",
    "DevOps Engineer",
    "Business Development",
    "Content Creator"
  ];

  const skillOptions = [
    "React", "TypeScript", "Node.js", "Python", "Figma", "AWS",
    "Design Systems", "Product Strategy", "Growth Marketing", "AI/ML",
    "Mobile Development", "Blockchain", "Analytics", "SEO/SEM",
    "Brand Design", "Copywriting", "Sales", "Project Management"
  ];

  const workStyleOptions = [
    "Collaborative", "Independent", "Detail-oriented", "Fast execution",
    "Creative brainstorming", "Data-driven", "User-focused", "Technical leadership",
    "Strategic thinking", "Problem-solving", "Communication", "Mentoring"
  ];

  const priorityOptions = [
    "Technical expertise", "Design sense", "Business acumen", "Industry experience",
    "Startup experience", "Leadership skills", "International perspective",
    "Strong network", "Full-time commitment", "Local presence",
    "Complementary skills", "Similar vision", "Cultural fit", "Reliability"
  ];

  // Toggle functions
  const toggleInArray = (
    array: string[],
    setArray: (value: string[]) => void,
    item: string
  ) => {
    setArray(array.includes(item) 
      ? array.filter(x => x !== item)
      : [...array, item]
    );
  };

  // Navigation
  const canNext = () => {
    switch (step) {
      case 1: return preferences.lookingFor.length > 0;
      case 2: return preferences.skills.length > 0;
      case 3: return true; // experience, availability, location always have defaults
      case 4: return preferences.workStyle.length > 0;
      case 5: return preferences.priorities.length > 0;
      case 6: return true; // additional info is optional
      default: return true;
    }
  };

  const goNext = () => {
    if (step < total) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const goPrev = () => {
    setDirection(-1);
    setStep(s => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Save preferences to user metadata or separate API
      if (user) {
        const meta = (user.unsafeMetadata as any) || {};
        await user.update({
          unsafeMetadata: {
            ...meta,
            partnerPreferences: preferences,
            lastPartnerSearch: new Date().toISOString(),
          }
        });
      }
      
      // Navigate to results page with preferences
      const queryParams = new URLSearchParams({
        projectId: preferences.projectId,
        projectName: preferences.projectName,
        lookingFor: preferences.lookingFor.join(','),
        skills: preferences.skills.join(','),
        experience: preferences.experience,
        availability: preferences.availability,
        location: preferences.location,
        workStyle: preferences.workStyle.join(','),
        commitment: preferences.commitment,
        priorities: preferences.priorities.join(','),
      });
      
      router.push(`/projects/loading?${queryParams.toString()}`);
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2400&auto=format&fit=crop)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Find Your Perfect Partner</h1>
            <span className="text-white/60 text-sm">
              Step {step} of {total}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div 
              className="bg-white rounded-full h-2"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / total) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Content card */}
        <div className="bg-zinc-950/80 border border-white/20 rounded-2xl p-8 backdrop-blur-xl">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              initial={{
                opacity: 0,
                x: direction === 1 ? 300 : -300,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: direction === 1 ? -300 : 300,
              }}
              transition={{
                duration: 0.5,
                ease: [0.25, 1, 0.5, 1],
              }}
              className="space-y-8"
            >
              {/* Step 1: What are you looking for? */}
              {step === 1 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                    <Target className="h-8 w-8 text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    What type of partner are you looking for?
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Select the roles that would complement your project &quot;{projectName}&quot;
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        onClick={() => toggleInArray(
                          preferences.lookingFor,
                          (val) => setPreferences(prev => ({ ...prev, lookingFor: val })),
                          role
                        )}
                        className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                          preferences.lookingFor.includes(role)
                            ? "border-blue-500 bg-blue-500/20 text-blue-400 scale-105"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/50 text-sm mt-4">
                    {preferences.lookingFor.length} selected
                  </p>
                </div>
              )}

              {/* Step 2: Required skills */}
              {step === 2 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <Star className="h-8 w-8 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    What skills are most important?
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Choose the technical and soft skills your ideal partner should have
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
                    {skillOptions.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleInArray(
                          preferences.skills,
                          (val) => setPreferences(prev => ({ ...prev, skills: val })),
                          skill
                        )}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          preferences.skills.includes(skill)
                            ? "border-green-500 bg-green-500/20 text-green-400 scale-105"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/50 text-sm mt-4">
                    {preferences.skills.length} selected
                  </p>
                </div>
              )}

              {/* Step 3: Experience & Logistics */}
              {step === 3 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                    <Briefcase className="h-8 w-8 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Experience & Work Preferences
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Set your preferences for experience level and working arrangements
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {/* Experience Level */}
                    <div>
                      <h3 className="text-white font-semibold mb-4">Experience Level</h3>
                      <div className="space-y-3">
                        {["any", "junior", "mid-level", "senior", "expert"].map((exp) => (
                          <button
                            key={exp}
                            onClick={() => setPreferences(prev => ({ ...prev, experience: exp }))}
                            className={`w-full p-3 rounded-lg border text-sm font-medium transition-all ${
                              preferences.experience === exp
                                ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                            }`}
                          >
                            {exp.charAt(0).toUpperCase() + exp.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Availability */}
                    <div>
                      <h3 className="text-white font-semibold mb-4">Availability</h3>
                      <div className="space-y-3">
                        {["part-time", "full-time", "flexible", "weekends"].map((avail) => (
                          <button
                            key={avail}
                            onClick={() => setPreferences(prev => ({ ...prev, availability: avail }))}
                            className={`w-full p-3 rounded-lg border text-sm font-medium transition-all ${
                              preferences.availability === avail
                                ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                            }`}
                          >
                            {avail.charAt(0).toUpperCase() + avail.slice(1).replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <h3 className="text-white font-semibold mb-4">Location</h3>
                      <div className="space-y-3">
                        {["remote", "local", "hybrid", "flexible"].map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setPreferences(prev => ({ ...prev, location: loc }))}
                            className={`w-full p-3 rounded-lg border text-sm font-medium transition-all ${
                              preferences.location === loc
                                ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                            }`}
                          >
                            {loc.charAt(0).toUpperCase() + loc.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Work Style */}
              {step === 4 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    What work style do you prefer?
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Select the working styles that match your collaboration preferences
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
                    {workStyleOptions.map((style) => (
                      <button
                        key={style}
                        onClick={() => toggleInArray(
                          preferences.workStyle,
                          (val) => setPreferences(prev => ({ ...prev, workStyle: val })),
                          style
                        )}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          preferences.workStyle.includes(style)
                            ? "border-yellow-500 bg-yellow-500/20 text-yellow-400 scale-105"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/50 text-sm mt-4">
                    {preferences.workStyle.length} selected
                  </p>
                </div>
              )}

              {/* Step 5: Priorities */}
              {step === 5 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mb-6">
                    <Target className="h-8 w-8 text-pink-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    What matters most to you?
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Choose your top priorities when evaluating potential partners
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
                    {priorityOptions.map((priority) => (
                      <button
                        key={priority}
                        onClick={() => toggleInArray(
                          preferences.priorities,
                          (val) => setPreferences(prev => ({ ...prev, priorities: val })),
                          priority
                        )}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          preferences.priorities.includes(priority)
                            ? "border-pink-500 bg-pink-500/20 text-pink-400 scale-105"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:scale-105"
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/50 text-sm mt-4">
                    {preferences.priorities.length} selected
                  </p>
                </div>
              )}

              {/* Step 6: Additional Info */}
              {step === 6 && (
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                    <Check className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Any additional requirements?
                  </h2>
                  <p className="text-white/70 mb-8 max-w-2xl mx-auto">
                    Share any specific requirements or preferences for your ideal partner
                  </p>
                  
                  <div className="max-w-2xl mx-auto">
                    <textarea
                      value={preferences.additionalInfo}
                      onChange={(e) => setPreferences(prev => ({ ...prev, additionalInfo: e.target.value }))}
                      placeholder="e.g., Must have experience with early-stage startups, should be comfortable with equity-based compensation, looking for someone in a similar time zone..."
                      rows={6}
                      className="w-full px-6 py-4 bg-zinc-900/80 border border-white/20 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/40 transition-all resize-none"
                    />
                    <p className="text-white/50 text-sm mt-2 text-right">
                      {preferences.additionalInfo.length} characters
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/20">
            {step > 1 ? (
              <button
                onClick={goPrev}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={goNext}
              disabled={!canNext() || isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Partners...
                </>
              ) : step < total ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Find Partners
                  <Target className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}