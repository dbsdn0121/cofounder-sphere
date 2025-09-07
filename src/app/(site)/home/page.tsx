/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBrowserSupabase, getCurrentUserProfileByClerk } from "@/lib/supabase";
import {
  Search,
  ArrowRight,
  Clock,
  CheckCircle,
  User,
  Briefcase,
  Heart,
  ExternalLink,
  TrendingUp,
  Users,
  MessageCircle,
  Star,
  MapPin,
  Loader2,
} from "lucide-react";

import { useConversations } from "../../../../hooks/useConversations";
import { useMatchingResults } from "../../../../hooks/useMatchingResults";

/* ------------------------------ Types ------------------------------ */
type RankingItem = {
  project_id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  submitted_at: string; // ISO
  keywords: string[] | null;
  likes_count: number;
};

type Prefetched = { url: string | null; description: string | null };

type ProjectStatus = "In Progress" | "Recruiting" | "Completed" | "Paused";

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  links: string[];
  createdAt: string;
  updatedAt: string;
  teamSize?: number;
  neededRoles?: string[];
  tech?: string[];
  owner?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
}

type Conversation = {
  id: string;
  other_user?: {
    display_name?: string;
    avatar_url?: string;
    role?: string;
  } | null;
  last_message_content?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  created_at?: string | null;
};

type Status = "online" | "offline";

type UMatch = {
  id: string;
  name: string;
  role: string;
  location: string;
  matchScore: number;
  avatar: string;
  status: Status;
  mutualConnections: number;
};

/* ------------------------------ Utils ------------------------------ */
function truncate(text?: string | null, max = 120) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max).trimEnd() + "...";
}
function extractFirstUrl(text?: string | null) {
  if (!text) return null;
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,63}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/i;
  const m = text.match(urlRegex);
  return m?.[0] ?? null;
}
const toStatus = (n: number): Status => (n % 2 === 0 ? "online" : "offline");

/* ------------------------------ Page ------------------------------ */
export default function HomeDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { userId, getToken } = useAuth();

  const supabase = useMemo(
    () => createBrowserSupabase((args) => getToken({ template: "supabase", ...(args || {}) })),
    [getToken]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [searchesCount, setSearchesCount] = useState<number>(0);

  const { conversations, loading: convLoading, error: convError } = useConversations();
  const recentConvos = useMemo(() => {
    const raw: Conversation[] = (conversations as unknown as Conversation[]) ?? [];
    const list = raw.map((c) => ({
      id: c.id,
      name: c.other_user?.display_name || "Unknown",
      avatar: c.other_user?.avatar_url || null,
      role: c.other_user?.role || "",
      lastLine: c.last_message_content || "No messages yet",
      at: c.last_message_at || c.created_at || new Date().toISOString(),
      unread: (c.unread_count ?? 0) > 0,
    }));
    return list
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 4);
  }, [conversations]);

  const activeChats = useMemo(
    () => ((conversations as unknown as Conversation[])?.length ?? 0),
    [conversations]
  );

  const unreadTotal = useMemo(() => {
    const raw: Conversation[] = (conversations as unknown as Conversation[]) ?? [];
    return raw.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
  }, [conversations]);

  const [top4, setTop4] = useState<RankingItem[]>([]);
  const [prefetched, setPrefetched] = useState<Record<string, Prefetched>>({});
  const [refreshMs] = useState<number>(30_000);

  const [recentMatches, setRecentMatches] = useState<UMatch[]>([]);
  const { matches: realMatches, loading: matchLoading, error: matchError } = useMatchingResults();

  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const handleSendMessage = async (matchedUserId: string) => {
    try {
      setSendingMessage(matchedUserId);
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withUserId: matchedUserId }),
      });
      const result = await res.json();
      if (result?.success) {
        router.push(`/messages?chat=${result.data.conversation.id}`);
      } else {
        alert("Failed to start conversation. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setSendingMessage(null);
    }
  };

  useEffect(() => {
    const fixScroll = () => {
      if (typeof document === "undefined") return;
      const body = document.body;
      const html = document.documentElement;
      body.style.overflow = "visible";
      body.style.height = "auto";
      html.style.overflow = "visible";
      html.style.height = "auto";
    };
    fixScroll();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return () => fixScroll();
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      loadDashboardData();
    } else if (!userId) {
      setProjects([]);
      setTotalMatches(0);
      setSearchesCount(0);
      setRecentMatches([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, userId]);

  const fetchUserProjects = async () => {
    if (!userId) return;

    try {
      const profile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!profile) return;

      const [curRes, compRes] = await Promise.all([
        supabase.from("current_projects").select("*").eq("user_id", profile.id),
        supabase.from("completed_projects").select("*").eq("user_id", profile.id),
      ]);

      if (curRes.error || compRes.error) return;

      const current =
        curRes.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status as ProjectStatus,
          links: p.links || [],
          createdAt: p.created_at,
          updatedAt: p.updated_at || p.created_at,
          owner: { id: profile.id, name: "You", role: "Owner" },
        })) ?? [];

      const completed =
        compRes.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: "Completed" as ProjectStatus,
          links: p.links || [],
          createdAt: p.created_at,
          updatedAt: p.created_at,
          owner: { id: profile.id, name: "You", role: "Owner" },
        })) ?? [];

      const all = [...current, ...completed].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setProjects(all);
    } catch (e) {
      console.error("fetchUserProjects error", e);
    }
  };

  const loadCounts = async () => {
    if (!userId) return;
    const profile = await getCurrentUserProfileByClerk(supabase, userId);
    if (!profile) return;

    const { count: matchCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);
    setTotalMatches(matchCount ?? 0);

    const { count: sCount } = await supabase
      .from("searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
    setSearchesCount(sCount ?? 0);
  };

  useEffect(() => {
    if (!realMatches || realMatches.length === 0) {
      setRecentMatches([]);
      return;
    }
    const mapped: UMatch[] = realMatches.map((m: any, i: number) => {
      const name = m.profile?.displayName || "Unknown";
      const initials =
        (name.split(" ").map((x: string) => x?.[0] ?? "").join("").slice(0, 2).toUpperCase()) || "U";

      return {
        id: m.profile?.id,
        name,
        role: m.profile?.role || "Co-founder",
        location: "Location not set",
        matchScore: Number(m.matchPercentage ?? 0),
        avatar: m.profile?.avatarUrl || initials,
        status: toStatus(i),
        mutualConnections: (m.profile?.skills?.length ?? 0) % 4,
      };
    });

    setRecentMatches(mapped.slice(0, 3));
  }, [realMatches]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUserProjects(), fetchTop4(), loadCounts()]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTop4 = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        period: "week",
        sortBy: "likes",
        page: "1",
        pageSize: "4",
      });
      const res = await fetch(`/api/rankings?${qs.toString()}`, { cache: "no-store" });

      if (res.ok) {
        const json = await res.json();
        const items: RankingItem[] = json?.items ?? [];
        if (items.length > 0) {
          setTop4(items);

          const ids = items.map((i) => i.project_id);
          const { data, error } = await supabase
            .from("submitted_projects")
            .select("id, description, external_url")
            .in("id", ids);
          if (!error) {
            const map: Record<string, Prefetched> = {};
            (data || []).forEach((row: any) => {
              map[row.id] = {
                url: row.external_url || extractFirstUrl(row.description || "") || null,
                description: row.description || null,
              };
            });
            setPrefetched(map);
          }
          return;
        }
      }

      const { data: proj, error: projErr } = await supabase
        .from("current_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (!projErr && proj && proj.length > 0) {
        const mapped: RankingItem[] = (proj as any[]).map((p) => ({
          project_id: p.id,
          title: p.name || "Untitled",
          owner_id: "",
          owner_name: "Unknown",
          submitted_at: p.created_at || "",
          keywords: [],
          likes_count: 0,
        }));
        setTop4(mapped);
        const map: Record<string, Prefetched> = {};
        (proj as any[]).forEach((p) => {
          map[p.id] = { url: null, description: p.description || null };
        });
        setPrefetched(map);
        return;
      }

      setTop4([]);
      setPrefetched({});
    } catch (e) {
      console.error("Failed to fetch top4:", e);
      setTop4([]);
      setPrefetched({});
    }
  }, [supabase]);

  useEffect(() => {
    fetchTop4();
    const t = setInterval(fetchTop4, refreshMs);
    return () => clearInterval(t);
  }, [fetchTop4, refreshMs]);

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="w-full min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back👋
              </h1>
              <p className="text-white/70">
                You have {activeChats} active chats and {unreadTotal} unread messages waiting for you.
              </p>
              {matchLoading && (
                <div className="text-xs text-white/50 mt-1">Loading recent matches…</div>
              )}
              {matchError && (
                <div className="text-xs text-red-400 mt-1">Failed to load matches</div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5">
                <div>
                  <div className="text-sm text-white/70">Total Matches</div>
                  <div className="text-2xl font-semibold text-white mt-1">{totalMatches}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 grid place-items-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5">
                <div>
                  <div className="text-sm text-white/70">Active Chats</div>
                  <div className="text-2xl font-semibold text-white mt-1">{activeChats}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 grid place-items-center">
                  <MessageCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5">
                <div>
                  <div className="text-sm text-white/70">My Projects</div>
                  <div className="text-2xl font-semibold text-white mt-1">{projects.length}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 grid place-items-center">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/5">
                <div>
                  <div className="text-sm text-white/70">Searches</div>
                  <div className="text-2xl font-semibold text-white mt-1">{searchesCount}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 grid place-items-center">
                  <Star className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Matches */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Recent Matches</h2>
                    <button
                      onClick={() => router.push("/matches")}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      View All <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {recentMatches.map((m) => {
                      const showInitial =
                        typeof m.avatar === "string" && !m.avatar.startsWith("http");
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-4 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center overflow-hidden">
                                {showInitial ? (
                                  <span className="text-sm font-bold text-white">{m.avatar}</span>
                                ) : (
                                  <img
                                    src={m.avatar}
                                    alt={m.name}
                                    className="w-14 h-14 object-cover"
                                  />
                                )}
                              </div>
                              <div
                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
                                  m.status === "online" ? "bg-green-500" : "bg-white/30"
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-semibold text-white leading-tight truncate">
                                {m.name}
                              </h3>
                              <p className="text-sm text-white/70">{m.role}</p>

                              <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-white/40" />
                                  {m.location}
                                </span>
                                <span className="text-white/40">•</span>
                                <span>{m.mutualConnections} mutual</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-sm font-medium text-green-400">
                                {m.matchScore}% match
                              </span>
                            </div>
                            <button
                              className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Like"
                            >
                              <Heart className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleSendMessage(m.id)}
                              disabled={sendingMessage === m.id}
                              className="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Message"
                            >
                              {sendingMessage === m.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageCircle className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => router.push("/find")}
                    className="w-full mt-4 p-3 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-blue-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-lg leading-none">+</span>
                    Start New Search
                  </button>
                </div>

                {/* Project Rankings */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Project Rankings</h2>
                    <button
                      onClick={() => router.push("/projects/rankings")}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      View All <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {top4.length === 0 ? (
                    <div className="text-white/60 text-sm py-6 text-center">
                      No submissions yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {top4.map((p, index) => {
                        const pre = prefetched[p.project_id];
                        const visitUrl = pre?.url || null;
                        const snippet = truncate(pre?.description, 120);
                        const trending =
                          p.likes_count >=
                          Math.max(10, Math.floor((top4[0]?.likes_count || 0) * 0.6));

                        return (
                          <div
                            key={p.project_id}
                            className="flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-full grid place-items-center font-bold text-sm ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : index === 1
                                  ? "bg-white/10 text-white/70"
                                  : index === 2
                                  ? "bg-orange-500/20 text-orange-400"
                                  : "bg-white/5 text-white/60"
                              }`}
                            >
                              {index + 1}
                            </div>

                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl grid place-items-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {p.title.substring(0, 2).toUpperCase()}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white truncate">
                                  {p.title}
                                </h3>
                                {trending && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                    <TrendingUp className="h-3 w-3" />
                                    <span className="text-xs font-medium">Hot</span>
                                  </div>
                                )}
                              </div>

                              {snippet && (
                                <p className="text-sm text-white/70 truncate">
                                  {snippet}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                                <span>by {p.owner_name}</span>
                                {p.keywords && p.keywords.length > 0 && (
                                  <>
                                    <span className="text-white/40">•</span>
                                    <span>
                                      {p.keywords.slice(0, 2).join(", ")}
                                      {p.keywords.length > 2 ? " +" : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center gap-1 text-red-400 mb-1">
                                <Heart className="h-4 w-4 fill-current" />
                                <span className="font-semibold">{p.likes_count}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (visitUrl)
                                    window.open(
                                      visitUrl,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                }}
                                className={`text-xs transition-colors inline-flex items-center gap-1 ${
                                  visitUrl
                                    ? "text-white/60 hover:text-white"
                                    : "text-white/30 cursor-not-allowed"
                                }`}
                                title={visitUrl ? "Visit website" : "No website provided"}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Visit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-right mt-4 text-[11px] text-white/40">
                    Auto-refresh every 30s (week · likes)
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Messages (우측 상단 고정) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Messages</h2>
                    <button
                      onClick={() => router.push("/messages")}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors text-sm"
                    >
                      View All <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {convLoading && (
                    <div className="text-center py-4 text-white/60 text-sm">
                      Loading conversations…
                    </div>
                  )}
                  {convError && (
                    <div className="text-center py-4 text-red-400 text-sm">
                      Failed to load conversations
                    </div>
                  )}
                  {!convLoading && recentConvos.length === 0 && (
                    <div className="text-center py-4 text-white/60 text-sm">
                      No messages yet
                    </div>
                  )}

                  <div className="space-y-2">
                    {recentConvos.slice(0, 3).map((c) => {
                      const initials = c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <button
                          key={c.id}
                          onClick={() => router.push(`/messages?chat=${c.id}`)}
                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg transition-colors text-left hover:bg-white/10 border border-white/10 ${
                            c.unread ? "bg-blue-500/5 border-blue-500/30" : ""
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center flex-shrink-0">
                            {c.avatar ? (
                              <img
                                src={c.avatar}
                                alt={c.name}
                                className="w-9 h-9 object-cover"
                              />
                            ) : (
                              <span className="text-[11px] font-bold text-white">
                                {initials}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-white text-sm truncate">
                                {c.name}
                              </h4>
                              <span className="text-[11px] text-white/60">
                                {new Date(c.at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-[12px] text-white/70 truncate">{c.lastLine}</p>
                            {c.unread && (
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🔁 위치 교체: My Projects가 위로, Quick Actions가 아래로 */}
                {/* My Projects */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6">
                  <h2 className="text-xl font-bold text-white mb-4">My Projects</h2>
                  {projects.slice(0, 3).map((p) => (
                    <div key={p.id} className="p-3 border border-white/10 rounded-xl mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl grid place-items-center">
                          <span className="text-sm font-bold text-white">
                            {p.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white truncate">{p.name}</h3>
                            <span className="text-xs text-white/60">
                              {new Date(p.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 truncate">{p.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {p.status}
                            </span>
                            {p.links?.[0] && (
                              <a
                                href={p.links[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-white"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => router.push("/projects")}
                    className="w-full mt-1 p-3 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-blue-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Go to Projects
                  </button>
                </div>

                {/* Quick Actions (아래로 이동) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push("/find")}
                      className="w-full p-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors flex items-center gap-3"
                    >
                      <Search className="h-5 w-5" />
                      Find New Co-founders
                    </button>
                    <button
                      onClick={() => router.push("/profile")}
                      className="w-full p-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors flex items-center gap-3"
                    >
                      <User className="h-5 w-5" />
                      Update My Profile
                    </button>
                    <button
                      onClick={() => router.push("/projects")}
                      className="w-full p-3 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors flex items-center gap-3"
                    >
                      <Briefcase className="h-5 w-5" />
                      Manage Projects
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
