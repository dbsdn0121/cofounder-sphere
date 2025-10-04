"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMatchingResults } from '../../../../../hooks/useMatchingResults';
import {
  MessageCircle,
  Eye,
  Heart,
  Users,
  MapPin,
  Briefcase,
  Code,
  ExternalLink,
  Github,
  Linkedin,
  X,
  Filter,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Zap,
  Loader2,
} from "lucide-react";

type FilterType = "all" | "Developer" | "Designer" | "Product" | "Biz/Marketing";

// 실제 데이터를 UI에 맞는 형태로 변환하는 함수
const transformMatchData = (realMatches: Record<string, unknown>[]) => {
  return realMatches.map((match, index) => ({
    id: match.profile.id,
    name: match.profile.displayName,
    avatar: match.profile.avatarUrl || `https://images.unsplash.com/photo-150700321116${index % 20}?w=150&h=150&fit=crop&crop=face`,
    role: match.profile.role || "Developer",
    headline: match.profile.headline || "Looking for co-founder to build something amazing",
    status: match.profile.status || "Student",
    matchScore: match.matchPercentage,
    location: "Location not set", // TODO: 위치 정보 추가 필요
    skills: match.profile.skills || [],
    workStyles: match.profile.workStyles || [],
    industries: match.profile.industries || [],
    currentProject: match.profile.currentProjects?.[0] ? {
      name: match.profile.currentProjects[0].name,
      description: match.profile.currentProjects[0].description,
      status: match.profile.currentProjects[0].status
    } : null,
    links: {
      github: match.profile.github,
      linkedin: match.profile.linkedin,
      portfolio: match.profile.website
    },
    followers: "N/A", // TODO: 실제 팔로워 수 추가 필요
    views: "N/A", // TODO: 실제 조회수 추가 필요
    engagement: "N/A", // TODO: 실제 참여율 추가 필요
    isOnline: Math.random() > 0.5 // TODO: 실제 온라인 상태 추가 필요
  }));
};

export default function MatchingResultsPage() {
  const router = useRouter();
  const { matches: realMatches, loading, error } = useMatchingResults();
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [likedMatches, setLikedMatches] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  // 실제 데이터를 UI 형식으로 변환
  useEffect(() => {
    if (realMatches.length > 0) {
      const transformedMatches = transformMatchData(realMatches);
      setMatches(transformedMatches);
    }
  }, [realMatches]);

  const filteredMatches = selectedFilter === "all" 
    ? matches 
    : matches.filter(match => match.role === selectedFilter);

  const toggleLike = (matchId: string) => {
    setLikedMatches(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleSendMessage = async (matchedUserId: string) => {
    try {
      setSendingMessage(matchedUserId);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withUserId: matchedUserId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 대화방으로 이동
        router.push(`/messages?chat=${result.data.conversation.id}`);
      } else {
        console.error('Failed to create conversation:', result.error);
        // TODO: 에러 토스트 알림 추가
        alert('Failed to start conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setSendingMessage(null);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400 border-green-500/30 bg-green-500/10";
    if (score >= 80) return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    if (score >= 70) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-gray-400 border-gray-500/30 bg-gray-500/10";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Developer": return <Code className="h-4 w-4" />;
      case "Designer": return <Sparkles className="h-4 w-4" />;
      case "Product": return <Target className="h-4 w-4" />;
      case "Biz/Marketing": return <Zap className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="h-6 w-6 text-pink-400" />
                Your Matches
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {loading ? "Loading matches..." : 
                 error ? "Error loading matches" :
                 matches.length === 0 ? "No matches found yet" :
                 `Showing 1-${filteredMatches.length} of ${matches.length} potential co-founders`}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex bg-zinc-900/60 border border-white/10 rounded-xl p-1">
                {(["all", "Developer", "Designer", "Product", "Biz/Marketing"] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedFilter === filter
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {filter === "all" ? "All" : filter}
                  </button>
                ))}
              </div>

              <button className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white/60" />
          <div className="text-white/70">Loading your matches...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-red-400 mb-2">Error: {error}</div>
          <div className="text-white/60">Please try refreshing or check back later</div>
        </div>
      )}

      {/* No matches found */}
      {!loading && !error && matches.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-white/30" />
          <div className="text-xl font-semibold text-white mb-2">No matches found yet</div>
          <div className="text-white/60">
            Complete your onboarding to start finding potential co-founders!
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!loading && !error && matches.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-white/20 transition-all duration-300 group cursor-pointer"
                onClick={() => setSelectedMatch(match)}
              >
                {/* Online Status */}
                {match.isOnline && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={match.avatar}
                        alt={match.name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10"
                      />
                      {match.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-black" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{match.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleIcon(match.role)}
                        <span className="text-sm text-white/70">{match.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold ${getMatchScoreColor(match.matchScore)}`}>
                    {match.matchScore}%
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-white/60 mb-1">
                      <Users className="h-3 w-3" />
                    </div>
                    <div className="text-sm font-semibold">{match.followers}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-white/60 mb-1">
                      <Eye className="h-3 w-3" />
                    </div>
                    <div className="text-sm font-semibold">{match.views}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-white/60 mb-1">
                      <Heart className="h-3 w-3" />
                    </div>
                    <div className="text-sm font-semibold">{match.engagement}</div>
                  </div>
                </div>

                {/* Headline */}
                <p className="text-sm text-white/80 mb-4 line-clamp-2">
                  {match.headline}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {match.skills.slice(0, 3).map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {match.skills.length > 3 && (
                    <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full">
                      +{match.skills.length - 3}
                    </span>
                  )}
                </div>

                {/* Current Project */}
                {match.currentProject && (
                  <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        match.currentProject.status === "Recruiting" ? "bg-green-400" : "bg-blue-400"
                      }`} />
                      <span className="text-xs font-medium text-white/90">
                        {match.currentProject.name}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 line-clamp-2">
                      {match.currentProject.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendMessage(match.id);
                    }}
                    disabled={sendingMessage === match.id}
                    className="flex-1 bg-white text-black py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage === match.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    {sendingMessage === match.id ? 'Starting...' : 'Message'}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(match.id);
                    }}
                    className={`p-2 rounded-lg border transition-all ${
                      likedMatches.includes(match.id)
                        ? "border-pink-500 bg-pink-500/20 text-pink-400"
                        : "border-white/20 bg-white/10 text-white/60 hover:text-pink-400 hover:border-pink-500/50"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedMatches.includes(match.id) ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {matches.length > 0 && (
            <div className="text-center mt-12">
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-xl font-medium transition-all">
                Load More Matches
              </button>
            </div>
          )}
        </div>
      )}

      {/* Profile Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-zinc-950 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold">Profile Details</h3>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                <img
                  src={selectedMatch.avatar}
                  alt={selectedMatch.name}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1">{selectedMatch.name}</h2>
                  <p className="text-white/80 mb-2">{selectedMatch.headline}</p>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedMatch.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {selectedMatch.status}
                    </span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full border font-bold ${getMatchScoreColor(selectedMatch.matchScore)}`}>
                  {selectedMatch.matchScore}% Match
                </div>
              </div>

              {/* Skills & Work Styles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Work Style</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.workStyles.map((style: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Industries */}
              <div>
                <h4 className="font-semibold mb-3">Industries of Interest</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMatch.industries.map((industry: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                      {industry}
                    </span>
                  ))}
                </div>
              </div>

              {/* Current Project */}
              {selectedMatch.currentProject && (
                <div>
                  <h4 className="font-semibold mb-3">Current Project</h4>
                  <div className="bg-zinc-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedMatch.currentProject.status === "Recruiting" ? "bg-green-400" : "bg-blue-400"
                      }`} />
                      <span className="font-medium">{selectedMatch.currentProject.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedMatch.currentProject.status === "Recruiting" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {selectedMatch.currentProject.status}
                      </span>
                    </div>
                    <p className="text-white/80">{selectedMatch.currentProject.description}</p>
                  </div>
                </div>
              )}

              {/* Links */}
              <div>
                <h4 className="font-semibold mb-3">Links</h4>
                <div className="flex gap-3">
                  {selectedMatch.links.github && (
                    <a href={selectedMatch.links.github} target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                  {selectedMatch.links.linkedin && (
                    <a href={selectedMatch.links.linkedin} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {selectedMatch.links.portfolio && (
                    <a href={selectedMatch.links.portfolio} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                      <ExternalLink className="h-4 w-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleSendMessage(selectedMatch.id)}
                  disabled={sendingMessage === selectedMatch.id}
                  className="flex-1 bg-white text-black py-3 px-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage === selectedMatch.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-5 w-5" />
                  )}
                  {sendingMessage === selectedMatch.id ? 'Starting...' : 'Send Message'}
                </button>
                <button 
                  onClick={() => toggleLike(selectedMatch.id)}
                  className={`px-6 py-3 rounded-xl border transition-all ${
                    likedMatches.includes(selectedMatch.id)
                      ? "border-pink-500 bg-pink-500/20 text-pink-400"
                      : "border-white/20 bg-white/10 text-white hover:border-pink-500/50 hover:text-pink-400"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${likedMatches.includes(selectedMatch.id) ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}