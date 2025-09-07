import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse, MatchingStatusResponse } from '../../../../../../types/api-responses';

// ✅ 서버 전용: 서비스 롤 클라이언트 (RLS 우회, 절대 클라이언트에 노출 안 됨)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } } // ❗ Promise 아님
) {
  try {
    // 1) Clerk 인증
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2) jobId 확인
    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // 3) 내 profiles.id 찾기 (clerk_user_id -> profiles.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // 4) 매칭 작업 조회 (서비스 롤로 조회 후 소유권 직접 검증)
    const { data: job, error: jobError } = await supabase
      .from('matching_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Matching job not found' },
        { status: 404 }
      );
    }

    // 5) 소유권 체크 (user_id === 내 profiles.id)
    if (job.user_id !== profile.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 6) 성공 응답
    return NextResponse.json<ApiResponse<MatchingStatusResponse>>(
      {
        success: true,
        data: { job },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Matching status error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
