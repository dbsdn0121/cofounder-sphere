import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../types/api-responses';
import type { CreateProposalRequest, CreateProposalResponse } from '../../../../../types/project-proposals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body: CreateProposalRequest = await request.json();
    const { conversationId, receiverId, projectName, description, roles, timeline, commitment } = body;

    // 2. 요청 데이터 검증
    if (!conversationId || !receiverId || !projectName.trim()) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'conversationId, receiverId, and projectName are required'
      }, { status: 400 });
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

    // 4. 대화방 접근 권한 확인
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .single();

    if (!conversation) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Access denied or conversation not found'
      }, { status: 403 });
    }

    // 5. 수신자 확인
    const { data: receiver } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', receiverId)
      .single();

    if (!receiver) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Receiver not found'
      }, { status: 404 });
    }

    // 6. 메시지로 먼저 제안 전송
    const proposalContent = `🚀 **Project Proposal: ${projectName}**\n\n${description || 'No description provided'}\n\nRoles needed: ${roles.join(', ')}\nTimeline: ${timeline || 'Not specified'}\nCommitment: ${commitment || 'Not specified'}`;

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: proposalContent,
        message_type: 'project_proposal',
        metadata: {
          project_name: projectName,
          description: description,
          roles: roles,
          timeline: timeline,
          commitment: commitment,
          proposal_status: 'pending'
        }
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
      `)
      .single();

    if (messageError) {
      console.error('Error creating proposal message:', messageError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to create proposal message'
      }, { status: 500 });
    }

    // 7. 프로젝트 제안 레코드 생성
    const { data: proposal, error: proposalError } = await supabase
      .from('project_proposals')
      .insert({
        conversation_id: conversationId,
        proposer_id: profile.id,
        receiver_id: receiverId,
        project_name: projectName,
        description: description,
        roles: roles,
        timeline: timeline,
        commitment: commitment,
        message_id: message.id,
        status: 'pending'
      })
      .select(`
        *,
        proposer:profiles!project_proposals_proposer_id_fkey(id, display_name, avatar_url, role),
        receiver:profiles!project_proposals_receiver_id_fkey(id, display_name, avatar_url, role)
      `)
      .single();

    if (proposalError) {
      console.error('Error creating proposal:', proposalError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to create proposal'
      }, { status: 500 });
    }

    // 8. 응답 데이터 변환
    const formattedMessage = {
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
    };

    const formattedProposal = {
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
    };

    return NextResponse.json<ApiResponse<CreateProposalResponse>>({
      success: true,
      data: {
        proposal: formattedProposal,
        message: formattedMessage
      }
    });

  } catch (error) {
    console.error('Create proposal error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}