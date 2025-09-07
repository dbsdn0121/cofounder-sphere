import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../types/api-responses';
import type { GetTeamResponse } from '../../../../../types/project-proposals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // 1. params 대기
    const { teamId } = await params;

    // 2. 사용자 인증 확인
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

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

    // 4. 팀 접근 권한 확인 (팀 멤버여야 함)
    const { data: membership } = await supabase
      .from('project_team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Access denied or team not found'
      }, { status: 403 });
    }

    // 5. 팀 정보 조회
    const { data: team, error: teamError } = await supabase
      .from('project_teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Team not found'
      }, { status: 404 });
    }

    // 6. 팀 멤버 조회
    const { data: members, error: membersError } = await supabase
      .from('project_team_members')
      .select(`
        *,
        user:profiles!project_team_members_user_id_fkey(id, display_name, avatar_url, role)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to fetch team members'
      }, { status: 500 });
    }

    // 7. 관련 제안 정보 조회
    const { data: proposal, error: proposalError } = await supabase
      .from('project_proposals')
      .select(`
        *,
        proposer:profiles!project_proposals_proposer_id_fkey(id, display_name, avatar_url, role),
        receiver:profiles!project_proposals_receiver_id_fkey(id, display_name, avatar_url, role)
      `)
      .eq('id', team.proposal_id)
      .single();

    if (proposalError) {
      console.error('Error fetching proposal:', proposalError);
    }

    // 8. 응답 데이터 변환
    const formattedTeam = {
      id: team.id,
      proposal_id: team.proposal_id,
      name: team.name,
      description: team.description,
      status: team.status,
      created_at: team.created_at,
      updated_at: team.updated_at
    };

    const formattedMembers = members?.map((member: any) => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      is_admin: member.is_admin,
      joined_at: member.joined_at,
      user: {
        id: member.user.id,
        display_name: member.user.display_name,
        avatar_url: member.user.avatar_url,
        role: member.user.role,
      }
    })) || [];

    const formattedProposal = proposal ? {
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
    } : undefined;

    return NextResponse.json<ApiResponse<GetTeamResponse>>({
      success: true,
      data: {
        team: formattedTeam,
        members: formattedMembers,
        proposal: formattedProposal!
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}