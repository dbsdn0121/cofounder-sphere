import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse, MatchingResultsResponse } from '../../../../../../types/api-responses';
import type { MatchingResultWithProfile } from '../../../../../../types/matching';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 1) route params
    const { userId } = await params;

    // 2) 인증
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3) 내 프로필 id
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

    // 4) 본인만 접근 가능
    if (userId !== profile.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 5) 1차 쿼리: matches + 상대 프로필(user2)만
    const { data: rows, error: mErr } = await supabase
      .from('matches')
      .select(`
        id,
        user2_id,
        match_percentage,
        rank,
        created_at,
        user2:profiles!matches_user2_id_fkey (
          id,
          display_name,
          headline,
          role,
          status,
          avatar_url,
          skills,
          work_styles,
          industries,
          github,
          x,
          website
        )
      `)
      .eq('user1_id', userId)
      .order('rank', { ascending: true })
      .limit(20);

    if (mErr) {
      console.error('Matching results error (step1):', mErr);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch matching results' },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json<ApiResponse<MatchingResultsResponse>>({
        success: true,
        data: { matches: [], totalCount: 0 }
      });
    }

    // 6) 2차 쿼리: 상대들의 current_projects 별도 조회
    const userIds = rows.map(r => r.user2_id).filter(Boolean);
    const { data: projects, error: pErr } = await supabase
      .from('current_projects')
      .select('id, user_id, name, description, status')
      .in('user_id', userIds);

    if (pErr) {
      console.error('Matching results error (step2):', pErr);
      // 프로젝트 실패해도 프로필/매칭은 반환
    }

    // user_id -> 프로젝트 배열 맵
    type ProjectRow = { id: string; user_id: string; name: string | null; description: string | null; status: string | null };
    const projMap = new Map<string, ProjectRow[]>();
    (projects ?? []).forEach((p: ProjectRow) => {
      const arr = projMap.get(p.user_id) ?? [];
      arr.push(p);
      projMap.set(p.user_id, arr);
    });

    // 7) 타입에 맞게 변환 (id 제거, null -> 기본값)
    const matches: MatchingResultWithProfile[] = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      matchPercentage: row.match_percentage,
      rank: row.rank,
      profile: {
        id: row.user2?.id,
        displayName: row.user2?.display_name,
        headline: row.user2?.headline,
        role: row.user2?.role,
        status: row.user2?.status,
        avatarUrl: row.user2?.avatar_url,
        skills: row.user2?.skills ?? [],
        workStyles: row.user2?.work_styles ?? [],
        industries: row.user2?.industries ?? [],
        currentProjects: (projMap.get(row.user2_id) ?? []).map((p) => ({
          name: p.name ?? '',
          description: p.description ?? '',
          status: p.status ?? 'Planning',
        })),
        github: row.user2?.github ?? null,
        linkedin: row.user2?.x ?? null, // x를 linkedin으로 매핑 유지
        website: row.user2?.website ?? null,
      }
    }));

    return NextResponse.json<ApiResponse<MatchingResultsResponse>>({
      success: true,
      data: { matches, totalCount: matches.length }
    });

  } catch (error) {
    console.error('Get matching results error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
