// /app/(site)/rankings/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Trophy,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  X,
  Calendar,
  User2,
  Tag,
  Flame,
  Share2,
  ArrowUpRight,
} from "lucide-react";
import {
  createBrowserSupabase,
  getCurrentUserProfileByClerk,
} from "@/lib/supabase";

/* ------------------------------ Types ------------------------------ */
type Period = "today" | "week" | "month" | "all";
type SortBy = "likes" | "newest";

type RankingItem = {
  project_id: string; // submitted_projects.id
  title: string;
  owner_id: string;
  owner_name: string;
  submitted_at: string; // ISO
  keywords: string[] | null;
  likes_count: number;
};

type SubmissionDetail = {
  id: string;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  submitted_at: string | null;
  external_url: string | null;
  owner_name?: string | null;
};

/* ------------------------------ Helpers ------------------------------ */
function formatDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso ?? "-";
  }
}
function clsx(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}
function extractFirstUrl(text?: string | null) {
  if (!text) return null;
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,63}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/i;
  const m = text.match(urlRegex);
  return m?.[0] ?? null;
}
function initials(s: string) {
  const parts = s.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}
// ✅ 카드 설명 줄임표
function truncate(text: string | null | undefined, max = 160) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "...";
}

/* ------------------------------ Page ------------------------------ */
export default function RankingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Supabase (Clerk 토큰 자동 주입)
  const supabase = useMemo(
    () => createBrowserSupabase(() => getToken({ template: "supabase" })),
    [getToken]
  );

  // URL ↔ 상태 동기화
  const [period, setPeriod] = useState<Period>(
    ((searchParams.get("period") as Period) || "week") as Period
  );
  const [sortBy, setSortBy] = useState<SortBy>(
    ((searchParams.get("sortBy") as SortBy) || "likes") as SortBy
  );
  const [page, setPage] = useState<number>(Number(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get("pageSize") || "12"));

  // 키워드 선택(고정 칩 + 검색 Enter)
  const initialKws = searchParams.getAll("kw");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(
    initialKws.length ? initialKws : []
  );
  const [searchText, setSearchText] = useState<string>("");

  // 목록/상세 상태
  const [items, setItems] = useState<RankingItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RankingItem | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ 카드에 바로 쓸 프리페치 데이터 (방문 URL + description)
  type Prefetched = { url: string | null; description: string | null };
  const [detailsMap, setDetailsMap] = useState<Record<string, Prefetched>>({});

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 내 profiles.id (좋아요 토글)
  useEffect(() => {
    (async () => {
      if (!user) {
        setProfileId(null);
        return;
      }
      const prof = await getCurrentUserProfileByClerk(supabase, user.id);
      setProfileId(prof?.id ?? null);
    })();
  }, [user, supabase]);

  // 데이터 로드
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("period", period);
      qs.set("sortBy", sortBy);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      selectedKeywords.forEach((k) => qs.append("kw", k));

      const res = await fetch(`/api/rankings?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load rankings");

      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [period, sortBy, page, pageSize, selectedKeywords]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // URL 동기화
  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set("period", period);
    qs.set("sortBy", sortBy);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    selectedKeywords.forEach((k) => qs.append("kw", k));
  
  }, [period, sortBy, page, pageSize, selectedKeywords, router]);

  // ✅ 카드용 프리페치 (external_url, description)
  useEffect(() => {
    (async () => {
      if (!items.length) {
        setDetailsMap({});
        return;
      }
      const ids = items.map((i) => i.project_id);
      const { data, error } = await supabase
        .from("submitted_projects")
        .select("id, external_url, description")
        .in("id", ids);

      if (error) {
        console.error("prefetch visit urls error:", error);
        return;
      }
      const map: Record<string, Prefetched> = {};
      (data || []).forEach((row: any) => {
        map[row.id] = {
          url: row.external_url || extractFirstUrl(row.description || "") || null,
          description: row.description || null,
        };
      });
      setDetailsMap(map);
    })();
  }, [items, supabase]);

  // 좋아요 토글
  const toggleLike = useCallback(
    async (submissionId: string) => {
      if (!profileId) {
        alert("로그인이 필요합니다.");
        return;
      }
      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, userId: profileId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to toggle like");

        setItems((prev) => {
          const next = prev.slice();
          const i = next.findIndex((it) => it.project_id === submissionId);
          if (i >= 0) next[i] = { ...next[i], likes_count: Number(data.likes_count) };
          return next;
        });

        if (selected?.project_id === submissionId && detail) {
          setDetail({ ...detail });
        }
      } catch (e) {
        console.error(e);
        alert("좋아요 처리에 실패했어요.");
      }
    },
    [profileId, selected, detail]
  );

  // 카드 클릭 → 상세
  const openDetail = useCallback(
    async (row: RankingItem) => {
      setSelected(row);
      setOpen(true);
      setDetail(null);
      setDetailLoading(true);
      try {
        const { data, error } = await supabase
          .from("submitted_projects")
          .select("id, title, description, keywords, submitted_at, external_url")
          .eq("id", row.project_id)
          .maybeSingle();

        if (error) throw error;

        setDetail({ ...(data as SubmissionDetail), owner_name: row.owner_name });
      } catch (e) {
        console.error("Failed to load detail:", e);
        setDetail({
          id: row.project_id,
          title: row.title,
          description: null,
          keywords: row.keywords,
          submitted_at: row.submitted_at,
          external_url: null,
          owner_name: row.owner_name,
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [supabase]
  );

  const closeDetail = useCallback(() => {
    setOpen(false);
    setSelected(null);
    setDetail(null);
  }, []);

  // 검색창 Enter → 키워드 추가
  const handleSearchEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const tokens = searchText
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.length) return;
      setSelectedKeywords((prev) =>
        Array.from(new Set([...prev, ...tokens.map((t) => t)]))
      );
      setSearchText("");
      setPage(1);
    },
    [searchText]
  );

  /* ---------- 고정 카테고리 칩 ---------- */
  const FIXED_CATEGORIES = [
    "AI",
    "Web",
    "Mobile",
    "Social Media",
    "FinTech",
    "HealthTech",
    "E-commerce",
    "Productivity Tools",
  ] as const;

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    FIXED_CATEGORIES.forEach((k) => (map[k] = 0));
    items.forEach((it) => {
      (it.keywords || []).forEach((k) => {
        if (map[k] !== undefined) map[k] += 1;
      });
    });
    return map;
  }, [items]);

  const periodTabs: { id: Period; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "all", label: "All Time" },
  ];

  const getVisitUrl = useCallback(
    (d?: SubmissionDetail | null) => d?.external_url || extractFirstUrl(d?.description || ""),
    []
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Top bar: Back + Title */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/projects")}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition"
            title="Back to Projects"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="pl-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">Project Rankings</h1>
            <p className="text-white/60 mt-1">Discover the most popular and trending startup projects</p>
          </div>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-xl font-semibold">
          <Trophy className="h-5 w-5" />
          Live Leaderboard
        </div>
      </div>

      {/* Search + Period Tabs */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Search projects, founders, or descriptions... (Enter to add keyword)"
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {periodTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPeriod(t.id);
                setPage(1);
              }}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                period === t.id
                  ? "bg-white text-black border-white shadow"
                  : "bg-zinc-900/60 text-white/70 hover:text-white hover:bg-white/10 border-white/10"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keyword category chips (fixed) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedKeywords([]);
              setPage(1);
            }}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              selectedKeywords.length === 0
                ? "bg-purple-600/20 text-purple-300 border-purple-500/30"
                : "bg-zinc-900/60 text-white/70 hover:text-white hover:bg-white/10 border-white/10"
            )}
            title="Clear all keywords"
          >
            All Categories
          </button>

          {(
            [
              "AI",
              "Web",
              "Mobile",
              "Social Media",
              "FinTech",
              "HealthTech",
              "E-commerce",
              "Productivity Tools",
            ] as const
          ).map((kw) => {
            const active = selectedKeywords.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => {
                  setSelectedKeywords((prev) =>
                    active ? prev.filter((x) => x !== kw) : [...prev, kw]
                  );
                  setPage(1);
                }}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                  active
                    ? "bg-white text-black border-white shadow"
                    : "bg-zinc-900/60 text-white/80 hover:text-white hover:bg-white/10 border-white/10"
                )}
              >
                {kw}
                <span className="ml-2 text-white/50">
                  {items.reduce(
                    (acc, it) => acc + Number((it.keywords || []).includes(kw)),
                    0
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-white/60 text-sm">Sort</span>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortBy);
            setPage(1);
          }}
          className="bg-zinc-900/60 border border-white/10 rounded-xl text-white px-3 py-2 outline-none focus:border-white/30"
        >
          <option value="likes">Likes</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-white/70" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-white/60">No submissions found</div>
      ) : (
        <>
          {/* List (styled card + description snippet) */}
          <div className="space-y-4">
            {items.map((it, idx) => {
              const hot = it.likes_count >= Math.max(10, Math.floor((items[0]?.likes_count || 0) * 0.6));
              const firstKw = it.keywords?.[0];
              const pre = detailsMap[it.project_id];
              const visitUrl = pre?.url || null;
              const snippet = truncate(pre?.description, 160);

              return (
                <div
                  key={it.project_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(it)}
                  onKeyDown={(e) => (e.key === "Enter" ? openDetail(it) : null)}
                  className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all focus:outline-none"
                >
                  <div className="flex items-start gap-4">
                    {/* Left vertical: trophy + hot */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div
                        className={clsx(
                          "rounded-full p-2",
                          idx === 0
                            ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                            : "bg-zinc-800/60 text-white/70 border border-white/10"
                        )}
                        title={idx === 0 ? "Top project" : "Ranked"}
                      >
                        <Trophy className="h-5 w-5" />
                      </div>
                      {hot && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-500/15 text-red-300 border border-red-500/25 select-none">
                          <Flame className="h-3 w-3" />
                          Hot
                        </span>
                      )}
                    </div>

                    {/* Avatar square */}
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 grid place-items-center text-white font-bold shrink-0">
                      {initials(it.title)}
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg md:text-xl font-semibold text-white">{it.title}</h3>

                        {/* Live pill */}
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                          Live
                        </span>

                        {/* Category (first keyword) */}
                        {firstKw && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/15">
                            {firstKw}
                          </span>
                        )}
                      </div>

                      {/* Meta line */}
                      <div className="text-sm text-white/60 flex flex-wrap items-center gap-4">
                        <span className="inline-flex items-center gap-1">
                          <User2 className="h-4 w-4" />
                          <span className="text-white/80">{it.owner_name}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(it.submitted_at)}
                        </span>
                      </div>

                      {/* ✅ Description snippet */}
                      {snippet && (
                        <p className="text-sm text-white/80 mt-2">
                          {snippet}
                        </p>
                      )}

                      {/* Keyword chips */}
                      {it.keywords && it.keywords.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {it.keywords.slice(0, 6).map((k, i) => (
                            <span
                              key={`${it.project_id}-kw-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-white/80 text-xs"
                            >
                              <Tag className="h-3 w-3" />
                              {k}
                            </span>
                          ))}
                          {it.keywords.length > 6 && (
                            <span className="px-2 py-1 rounded-md bg-white/10 text-white/60 text-xs">
                              +{it.keywords.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="shrink-0 flex flex-col items-end gap-3">
                      {/* Visit button (enabled only if we have a URL) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!visitUrl) return;
                          window.open(visitUrl, "_blank", "noopener,noreferrer");
                        }}
                        disabled={!visitUrl}
                        className={clsx(
                          "inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition",
                          visitUrl
                            ? "text-white/90 hover:text-white hover:bg-white/10 border-white/20"
                            : "text-white/30 border-white/10 cursor-not-allowed"
                        )}
                        title={visitUrl ? "Visit website" : "No website provided"}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>

                      {/* Likes */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(it.project_id);
                        }}
                        className="inline-flex items-center gap-2 bg-pink-500/15 text-pink-300 border border-pink-500/25 px-3 py-1.5 rounded-lg hover:bg-pink-500/25 transition"
                        title="Like"
                      >
                        <Heart className="h-4 w-4" />
                        <span className="text-sm font-semibold">{it.likes_count}</span>
                      </button>

                      {/* Share */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard
                            .writeText(`${location.origin}/project/${it.project_id}`)
                            .catch(() => {});
                        }}
                        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
                        title="Share link"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 text-white/60 text-sm">
            <div>
              Page {page} / {totalPages} · {total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="bg-zinc-900/60 border border-white/10 rounded-lg text-white px-2 py-2 outline-none focus:border-white/30"
              >
                {[6, 12, 18, 24].map((n) => (
                  <option value={n} key={n}>
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal (동일) */}
      {open && selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeDetail}
          role="dialog"
          aria-modal
        >
          <div
            className="bg-zinc-950/95 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-semibold text-white truncate">
                    {selected.title}
                  </h3>
                  <a
                    className="inline-flex items-center text-white/70 hover:text-white"
                    href={(detail?.external_url || extractFirstUrl(detail?.description || "")) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!(detail?.external_url || extractFirstUrl(detail?.description || ""))) e.preventDefault();
                    }}
                    title="Visit website"
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </a>
                </div>
                <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
                  <User2 className="h-3 w-3" />
                  <span className="text-white/80">{selected.owner_name}</span>
                  <span>·</span>
                  <Calendar className="h-3 w-3" />
                  {formatDate(selected.submitted_at)}
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleLike(selected.project_id)}
                  className="inline-flex items-center gap-2 bg-pink-500/15 text-pink-300 border border-pink-500/25 px-4 py-2 rounded-lg hover:bg-pink-500/25 transition"
                  title="Like"
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {items.find((i) => i.project_id === selected.project_id)?.likes_count ??
                      selected.likes_count}
                  </span>
                </button>

                {(() => {
                  const url = detail?.external_url || extractFirstUrl(detail?.description || "");
                  return (
                    <a
                      href={url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!url) e.preventDefault();
                      }}
                      className={clsx(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition",
                        url
                          ? "bg-white text-black hover:bg-gray-100 border-white/10"
                          : "bg-white/10 text-white/40 border-white/10 cursor-not-allowed"
                      )}
                      title={url ? "Visit Website" : "No website found"}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm font-semibold">Visit Website</span>
                    </a>
                  );
                })()}
              </div>

              {/* Keywords */}
              {selected.keywords && selected.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-white/60 mb-2">Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.keywords.map((k, i) => (
                      <span
                        key={`${selected.project_id}-kw-modal-${i}`}
                        className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-md"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="text-xs text-white/60 mb-2">Description</div>
                <div className="text-white/80 text-sm leading-6 whitespace-pre-wrap">
                  {detailLoading ? (
                    <div className="inline-flex items-center gap-2 text-white/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading description...
                    </div>
                  ) : detail?.description ? (
                    detail.description
                  ) : (
                    <span className="text-white/40">No description provided.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-white/50">
                Submission ID: <span className="text-white/70">{selected.project_id}</span>
              </div>
              <div className="text-xs text-white/50">
                Last updated: {formatDate(detail?.submitted_at || selected.submitted_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
