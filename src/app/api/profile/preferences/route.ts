import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// 서버 전용: 서비스 롤 사용 (클라이언트 번들 금지 - 라우트 파일이므로 OK)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const projectPreferences = body?.projectPreferences ?? {};
    const onboardingCompleted = !!body?.onboardingCompleted;
    const onboardingCompletedAt =
      typeof body?.onboardingCompletedAt === "string"
        ? body.onboardingCompletedAt
        : new Date().toISOString();

    // 내 profiles.id 찾기
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // 정규화
    const norm = (v: unknown) => (Array.isArray(v) ? v : []);
    const prefs = {
      industries: norm(projectPreferences?.industries),
      problemToSolve: typeof projectPreferences?.problemToSolve === "string" ? projectPreferences.problemToSolve : "",
      noIdeaYet: !!projectPreferences?.noIdeaYet,
      goals: norm(projectPreferences?.goals),
      partnerRoles: norm(projectPreferences?.partnerRoles),
      expectations: norm(projectPreferences?.expectations),
      collaboration: norm(projectPreferences?.collaboration),
      timeCommitment: typeof projectPreferences?.timeCommitment === "string" ? projectPreferences.timeCommitment : "",
      teamCulture: norm(projectPreferences?.teamCulture),
      projectName: typeof projectPreferences?.projectName === "string" ? projectPreferences.projectName : "",
      decideWithPartner: !!projectPreferences?.decideWithPartner,
    };

    // 업데이트
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        project_preferences: prefs,
        onboarding_completed: onboardingCompleted,
        onboarding_completed_at: onboardingCompletedAt,
      })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("save preferences error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
