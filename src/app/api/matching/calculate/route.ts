import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { startMatching } from '../../../../lib/matching/matching-service';
import type { ApiResponse, StartMatchingResponse } from '../../../../../types/api-responses';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const authResult = await auth();
    const clerkUserId = authResult?.userId;
    
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, onboarding_completed, project_preferences')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // 3. 온보딩 완료 여부 확인
    if (!profile.onboarding_completed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Onboarding not completed' },
        { status: 400 }
      );
    }

    // 4. 프로젝트 선호도 데이터 확인
    if (!profile.project_preferences) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Project preferences not found' },
        { status: 400 }
      );
    }

    // 5. 기존 진행 중인 매칭 작업 확인
    const { data: existingJob } = await supabase
      .from('matching_jobs')
      .select('id, status')
      .eq('user_id', profile.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json<ApiResponse<StartMatchingResponse>>(
        {
          success: true,
          data: {
            jobId: existingJob.id,
            message: 'Matching already in progress'
          }
        },
        { status: 200 }
      );
    }

    // 6. 새로운 매칭 작업 시작
    const jobId = await startMatching(profile.id);

    return NextResponse.json<ApiResponse<StartMatchingResponse>>(
      {
        success: true,
        data: {
          jobId,
          message: 'Matching started successfully'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Matching calculation error:', error);
    
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}