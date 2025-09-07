// /app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 서버에서 Supabase client (service_role 있으면 우선 사용)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const period = searchParams.get("period") ?? "all";   // today|week|month|all
  const sortBy = searchParams.get("sortBy") ?? "likes"; // likes|newest
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  // 여러 키워드: ?kw=AI&kw=Web → ["AI","Web"]
  const keywords = searchParams.getAll("kw");
  const p_keywords = keywords.length ? keywords : null;

  // 랭킹 데이터 가져오기
  const { data, error } = await supabase.rpc("get_project_rankings", {
    p_period: period,
    p_keywords,
    p_sort_by: sortBy,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 총 개수도 같이 반환 (페이지네이션 UI용)
  const { data: totalCountData, error: countErr } = await supabase.rpc(
    "get_project_rankings_count",
    {
      p_period: period,
      p_keywords,
    }
  );

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 400 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: totalCountData ?? 0,
    page,
    pageSize,
  });
}
