import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../../types/api-responses';
import type { ConversationMessagesResponse } from '../../../../../../types/messaging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // 1. params 대기
    const { conversationId } = await params;

    // 2. 사용자 인증 확인
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // 3. URL 파라미터 확인
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // 5. 대화방 존재 및 접근 권한 확인
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
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // 접근 권한 확인
    if (conversation.user1_id !== profile.id && conversation.user2_id !== profile.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    // 6. 메시지 목록 조회
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to fetch messages'
      }, { status: 500 });
    }

    // 7. 메시지 읽음 처리 (상대방이 보낸 안 읽은 메시지들)
    if (messages && messages.length > 0) {
      const unreadMessageIds = messages
        .filter(msg => msg.sender_id !== profile.id && !msg.read_at)
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessageIds);
      }
    }

    // 8. 전체 메시지 수 조회
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    // 9. 응답 데이터 변환
    const otherUser = conversation.user1_id === profile.id ? conversation.user2 : conversation.user1;
    
    const formattedConversation = {
      id: conversation.id,
      user1_id: conversation.user1_id,
      user2_id: conversation.user2_id,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      last_message_at: conversation.last_message_at,
      last_message_content: conversation.last_message_content,
      last_message_sender_id: conversation.last_message_sender_id,
      other_user: {
        id: otherUser.id,
        display_name: otherUser.display_name,
        avatar_url: otherUser.avatar_url,
        role: otherUser.role,
        status: otherUser.status,
      },
      unread_count: 0 // 방금 읽음 처리했으므로 0
    };

    const formattedMessages = messages?.map((msg: Record<string, unknown>) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      message_type: msg.message_type,
      metadata: msg.metadata,
      created_at: msg.created_at,
      read_at: msg.read_at,
      sender: {
        id: msg.sender.id,
        display_name: msg.sender.display_name,
        avatar_url: msg.sender.avatar_url,
        role: msg.sender.role,
      }
    })) || [];

    return NextResponse.json<ApiResponse<ConversationMessagesResponse>>({
      success: true,
      data: {
        conversation: formattedConversation,
        messages: formattedMessages,
        totalCount: count || 0
      }
    });

  } catch (error) {
    console.error('Get conversation messages error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}