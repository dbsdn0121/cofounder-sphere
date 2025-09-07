import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../types/api-responses';
import type { SendMessageRequest, SendMessageResponse } from '../../../../../types/messaging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 배열로 올 수도, 객체로 올 수도 있는 조인 결과를 단일 객체로 정규화
function pickOne<T = any>(v: any): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function POST(request: NextRequest) {
  try {
    // 1) 인증
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2) 입력 파싱
    const body: SendMessageRequest = await request.json();
    const { conversationId, content, messageType = 'text', metadata } = body;
    if (!conversationId || !content?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'conversationId and content are required' },
        { status: 400 }
      );
    }

    // 3) 내 프로필
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

    // 4) 대화방 접근 확인
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, display_name, avatar_url, role, status),
        user2:profiles!conversations_user2_id_fkey(id, display_name, avatar_url, role, status)
      `)
      .eq('id', conversationId)
      .single();
    if (conversationError || !conversation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    if (conversation.user1_id !== profile.id && conversation.user2_id !== profile.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 5) metadata 보정
    let normalizedMetadata: Record<string, any> | null = null;
    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata === 'string') {
        try {
          normalizedMetadata = JSON.parse(metadata);
        } catch {
          normalizedMetadata = { raw: metadata };
        }
      } else if (typeof metadata === 'object') {
        normalizedMetadata = metadata as Record<string, any>;
      }
    }

    // 6) 메시지 INSERT
    const receiverId =
      conversation.user1_id === profile.id ? conversation.user2_id : conversation.user1_id;

    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: profile.id,
          receiver_id: receiverId,
          content: content.trim(),
          message_type: messageType,
          metadata: normalizedMetadata ?? null, // jsonb
        },
      ])
      .select(`
        id, conversation_id, sender_id, receiver_id, content, message_type, metadata, created_at, read_at,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
      `)
      .single();

    if (messageError || !newMessage) {
      console.error('Error sending message:', messageError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // 7) project_proposal이면 proposal.message_id 연결(옵션이지만 권장)
    if (
      messageType === 'project_proposal' &&
      normalizedMetadata &&
      typeof normalizedMetadata.proposal_id === 'string'
    ) {
      const { error: linkErr } = await supabase
        .from('project_proposals')
        .update({ message_id: newMessage.id })
        .eq('id', normalizedMetadata.proposal_id);
      if (linkErr) {
        console.warn('[messages/send] failed to link proposal.message_id:', linkErr);
      }
    }

    // 8) 최신 대화방 (조인 결과 정규화 필요)
    const { data: updatedConversation } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, display_name, avatar_url, role, status),
        user2:profiles!conversations_user2_id_fkey(id, display_name, avatar_url, role, status)
      `)
      .eq('id', conversationId)
      .single();

    const user1 = pickOne(updatedConversation?.user1);
    const user2 = pickOne(updatedConversation?.user2);
    const otherUser =
      updatedConversation?.user1_id === profile.id ? user2 : user1;

    const formattedConversation = updatedConversation
      ? {
          id: updatedConversation.id,
          user1_id: updatedConversation.user1_id,
          user2_id: updatedConversation.user2_id,
          created_at: updatedConversation.created_at,
          updated_at: updatedConversation.updated_at,
          last_message_at: updatedConversation.last_message_at,
          last_message_content: updatedConversation.last_message_content,
          last_message_sender_id: updatedConversation.last_message_sender_id,
          other_user: otherUser
            ? {
                id: otherUser.id,
                display_name: otherUser.display_name,
                avatar_url: otherUser.avatar_url,
                role: otherUser.role,
                status: otherUser.status,
              }
            : undefined,
          unread_count: 0,
        }
      : conversation;

    // sender 조인 정규화 (여기가 TS 에러 나는 부분의 핵심)
    const sender = pickOne(newMessage.sender);

    const formattedMessage = {
      id: newMessage.id,
      conversation_id: newMessage.conversation_id,
      sender_id: newMessage.sender_id,
      receiver_id: newMessage.receiver_id,
      content: newMessage.content,
      message_type: newMessage.message_type,
      metadata: newMessage.metadata,
      created_at: newMessage.created_at,
      read_at: newMessage.read_at,
      sender: sender
        ? {
            id: sender.id,
            display_name: sender.display_name,
            avatar_url: sender.avatar_url,
            role: sender.role,
          }
        : undefined,
    };

    return NextResponse.json<ApiResponse<SendMessageResponse>>({
      success: true,
      data: {
        message: formattedMessage,
        conversation: formattedConversation,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
