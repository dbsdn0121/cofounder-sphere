import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../types/api-responses';
import type { GetProposalsResponse } from '../../../../../types/project-proposals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // 2. URL 파라미터 확인
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, accepted, declined
    const type = searchParams.get('type'); // sent, received, all
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // 4. 쿼리 조건 구성
    let query = supabase
      .from('project_proposals')
      .select(`
        *,
        proposer:profiles!project_proposals_proposer_id_fkey(id, display_name, avatar_url, role),
        receiver:profiles!project_proposals_receiver_id_fkey(id, display_name, avatar_url, role)
      `);

    // 타입별 필터링
    if (type === 'sent') {
      query = query.eq('proposer_id', profile.id);
    } else if (type === 'received') {
      query = query.eq('receiver_id', profile.id);
    } else {
      // all 또는 타입이 지정되지 않은 경우
      query = query.or(`proposer_id.eq.${profile.id},receiver_id.eq.${profile.id}`);
    }

    // 상태별 필터링
    if (status && ['pending', 'accepted', 'declined'].includes(status)) {
      query = query.eq('status', status);
    }

    // 정렬 및 페이지네이션
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: proposals, error: proposalsError } = await query;

    if (proposalsError) {
      console.error('Error fetching proposals:', proposalsError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to fetch proposals'
      }, { status: 500 });
    }

    // 5. 전체 개수 조회
    let countQuery = supabase
      .from('project_proposals')
      .select('*', { count: 'exact', head: true });

    if (type === 'sent') {
      countQuery = countQuery.eq('proposer_id', profile.id);
    } else if (type === 'received') {
      countQuery = countQuery.eq('receiver_id', profile.id);
    } else {
      countQuery = countQuery.or(`proposer_id.eq.${profile.id},receiver_id.eq.${profile.id}`);
    }

    if (status && ['pending', 'accepted', 'declined'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    // 6. 응답 데이터 변환
    const formattedProposals = proposals?.map((proposal: any) => ({
      id: proposal.id,
      conversation_id: proposal.conversation_id,
      proposer_id: proposal.proposer_id,
      receiver_id: proposal.receiver_id,
      project_name: proposal.project_name,
      description: proposal.description,
      roles: proposal.roles,
      timeline: proposal.timeline,
      commitment: proposal.commitment,
      status: proposal.status,
      message_id: proposal.message_id,
      created_at: proposal.created_at,
      responded_at: proposal.responded_at,
      response_message: proposal.response_message,
      proposer: {
        id: proposal.proposer.id,
        display_name: proposal.proposer.display_name,
        avatar_url: proposal.proposer.avatar_url,
        role: proposal.proposer.role,
      },
      receiver: {
        id: proposal.receiver.id,
        display_name: proposal.receiver.display_name,
        avatar_url: proposal.receiver.avatar_url,
        role: proposal.receiver.role,
      }
    })) || [];

    return NextResponse.json<ApiResponse<GetProposalsResponse>>({
      success: true,
      data: {
        proposals: formattedProposals,
        totalCount: count || 0
      }
    });

  } catch (error) {
    console.error('Get proposals error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}