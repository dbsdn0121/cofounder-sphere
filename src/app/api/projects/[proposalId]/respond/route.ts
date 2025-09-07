import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../../types/api-responses';
import type { RespondToProposalRequest, RespondToProposalResponse } from '../../../../../../types/project-proposals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    // 1. params 대기
    const { proposalId } = await params;

    // 2. 사용자 인증 확인
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body: RespondToProposalRequest = await request.json();
    const { response, responseMessage } = body;

    // 3. 요청 데이터 검증
    if (!['accepted', 'declined'].includes(response)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid response. Must be "accepted" or "declined"'
      }, { status: 400 });
    }

    // 4. 사용자 프로필 조회
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

    // 5. 제안 조회 및 권한 확인
    const { data: proposal, error: proposalError } = await supabase
      .from('project_proposals')
      .select(`
        *,
        proposer:profiles!project_proposals_proposer_id_fkey(id, display_name, avatar_url, role),
        receiver:profiles!project_proposals_receiver_id_fkey(id, display_name, avatar_url, role)
      `)
      .eq('id', proposalId)
      .eq('receiver_id', profile.id)
      .eq('status', 'pending')
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Proposal not found or you are not authorized to respond'
      }, { status: 404 });
    }

    // 6. 제안 상태 업데이트
    const { data: updatedProposal, error: updateError } = await supabase
      .from('project_proposals')
      .update({
        status: response,
        responded_at: new Date().toISOString(),
        response_message: responseMessage || null
      })
      .eq('id', proposalId)
      .select(`
        *,
        proposer:profiles!project_proposals_proposer_id_fkey(id, display_name, avatar_url, role),
        receiver:profiles!project_proposals_receiver_id_fkey(id, display_name, avatar_url, role)
      `)
      .single();

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to update proposal'
      }, { status: 500 });
    }

    // 7. 관련 메시지의 metadata 업데이트
    if (proposal.message_id) {
      await supabase
        .from('messages')
        .update({
          metadata: {
            ...proposal,
            proposal_status: response,
            responded_at: new Date().toISOString(),
            response_message: responseMessage
          }
        })
        .eq('id', proposal.message_id);
    }

    // 8. 응답 메시지 생성
    const responseContent = response === 'accepted' 
      ? `🎉 **Project Proposal Accepted!**\n\n"${proposal.project_name}" proposal has been accepted! You can now start collaborating together.${responseMessage ? `\n\nMessage: ${responseMessage}` : ''}`
      : `❌ **Project Proposal Declined**\n\n"${proposal.project_name}" proposal has been declined.${responseMessage ? `\n\nReason: ${responseMessage}` : ''}`;

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: proposal.conversation_id,
        sender_id: profile.id,
        content: responseContent,
        message_type: 'system',
        metadata: {
          proposal_id: proposalId,
          proposal_response: response,
          project_name: proposal.project_name
        }
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
      `)
      .single();

    if (messageError) {
      console.error('Error creating response message:', messageError);
    }

    let createdTeam = null;

    // 9. 수락된 경우 팀 생성
    if (response === 'accepted') {
      const { data: team, error: teamError } = await supabase
        .from('project_teams')
        .insert({
          proposal_id: proposalId,
          name: proposal.project_name,
          description: proposal.description,
          status: 'active'
        })
        .select()
        .single();

      if (!teamError && team) {
        // 팀 멤버 추가 (제안자는 관리자, 수신자는 일반 멤버)
        const teamMembers = [
          {
            team_id: team.id,
            user_id: proposal.proposer_id,
            role: 'Project Lead',
            is_admin: true
          },
          {
            team_id: team.id,
            user_id: proposal.receiver_id,
            role: proposal.roles?.[0] || 'Team Member',
            is_admin: false
          }
        ];

        await supabase
          .from('project_team_members')
          .insert(teamMembers);

        createdTeam = team;
      }
    }

    // 10. 응답 데이터 변환
    const formattedProposal = {
      id: updatedProposal.id,
      conversation_id: updatedProposal.conversation_id,
      proposer_id: updatedProposal.proposer_id,
      receiver_id: updatedProposal.receiver_id,
      project_name: updatedProposal.project_name,
      description: updatedProposal.description,
      roles: updatedProposal.roles,
      timeline: updatedProposal.timeline,
      commitment: updatedProposal.commitment,
      status: updatedProposal.status,
      message_id: updatedProposal.message_id,
      created_at: updatedProposal.created_at,
      responded_at: updatedProposal.responded_at,
      response_message: updatedProposal.response_message,
      proposer: {
        id: updatedProposal.proposer.id,
        display_name: updatedProposal.proposer.display_name,
        avatar_url: updatedProposal.proposer.avatar_url,
        role: updatedProposal.proposer.role,
      },
      receiver: {
        id: updatedProposal.receiver.id,
        display_name: updatedProposal.receiver.display_name,
        avatar_url: updatedProposal.receiver.avatar_url,
        role: updatedProposal.receiver.role,
      }
    };

    const formattedMessage = message ? {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      message_type: message.message_type,
      metadata: message.metadata,
      created_at: message.created_at,
      read_at: message.read_at,
      sender: {
        id: message.sender.id,
        display_name: message.sender.display_name,
        avatar_url: message.sender.avatar_url,
        role: message.sender.role,
      }
    } : null;

    return NextResponse.json<ApiResponse<RespondToProposalResponse>>({
      success: true,
      data: {
        proposal: formattedProposal,
        team: createdTeam || undefined,
        message: formattedMessage
      }
    });

  } catch (error) {
    console.error('Respond to proposal error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}