// /app/api/likes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// POST /api/likes
// body: { submissionId: string, userId: string }
export async function POST(req: Request) {
  try {
    const { submissionId, userId } = await req.json();

    if (!submissionId || !userId) {
      return NextResponse.json(
        { error: "submissionId and userId are required" },
        { status: 400 }
      );
    }

    // Supabase RPC 호출
    const { data, error } = await supabase.rpc("toggle_project_like", {
      p_submission_id: submissionId,
      p_user_id: userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // toggle_project_like는 배열로 반환되니까 첫 번째 row만 반환
    return NextResponse.json(data?.[0] ?? { liked: false, likes_count: 0 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
