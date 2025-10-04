import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../types/api-responses';
import type { ConversationsResponse, CreateConversationRequest, CreateConversationResponse } from '../../../../types/messaging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - 사용자의 모든 대화방 목록 조회
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

    // 2. 사용자 프로필 조회
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

    // 3. 사용자의 대화방 목록 조회 (상대방 정보 포함)
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, display_name, avatar_url, role, status),
        user2:profiles!conversations_user2_id_fkey(id, display_name, avatar_url, role, status)
      `)
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Failed to fetch conversations'
      }, { status: 500 });
    }

    // 4. 각 대화방의 읽지 않은 메시지 수 계산
    const conversationIds = conversations?.map(c => c.id) || [];
    
    let unreadCounts: Record<string, number> = {};
    if (conversationIds.length > 0) {
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', profile.id)
        .is('read_at', null);

      if (unreadData) {
        unreadCounts = unreadData.reduce((acc, msg) => {
          acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // 5. 응답 데이터 변환
    const formattedConversations = conversations?.map((conv: Record<string, unknown>) => {
      const otherUser = conv.user1_id === profile.id ? conv.user2 : conv.user1;
      
      return {
        id: conv.id,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_message_at: conv.last_message_at,
        last_message_content: conv.last_message_content,
        last_message_sender_id: conv.last_message_sender_id,
        other_user: {
          id: otherUser.id,
          display_name: otherUser.display_name,
          avatar_url: otherUser.avatar_url,
          role: otherUser.role,
          status: otherUser.status,
        },
        unread_count: unreadCounts[conv.id] || 0
      };
    }) || [];

    return NextResponse.json<ApiResponse<ConversationsResponse>>({
      success: true,
      data: {
        conversations: formattedConversations,
        totalCount: formattedConversations.length
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - 새로운 대화방 생성 또는 기존 대화방 조회
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

    const body: CreateConversationRequest = await request.json();
    const { withUserId, initialMessage } = body;

    if (!withUserId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'withUserId is required'
      }, { status: 400 });
    }

    // 2. 사용자 프로필 조회
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

    // 3. 상대방 프로필 확인
    const { data: otherProfile, error: otherProfileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, status')
      .eq('id', withUserId)
      .single();

    if (otherProfileError || !otherProfile) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Target user not found'
      }, { status: 404 });
    }

    // 4. 매칭 관계 확인 (서로 매칭된 사용자들만 대화 가능)
    const { data: matchData } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${profile.id},user2_id.eq.${withUserId}),and(user1_id.eq.${withUserId},user2_id.eq.${profile.id})`)
      .limit(1);

    if (!matchData || matchData.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Cannot start conversation with non-matched user'
      }, { status: 403 });
    }

    // 5. 기존 대화방 확인 (user1_id는 항상 더 작은 ID)
    const user1Id = profile.id < withUserId ? profile.id : withUserId;
    const user2Id = profile.id < withUserId ? withUserId : profile.id;

    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(id, display_name, avatar_url, role, status),
        user2:profiles!conversations_user2_id_fkey(id, display_name, avatar_url, role, status)
      `)
      .eq('user1_id', user1Id)
      .eq('user2_id', user2Id)
      .single();

    let conversation;
    let newMessage;

    if (existingConversation) {
      // 6a. 기존 대화방이 있는 경우
      conversation = existingConversation;
    } else {
      // 6b. 새로운 대화방 생성
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select(`
          *,
          user1:profiles!conversations_user1_id_fkey(id, display_name, avatar_url, role, status),
          user2:profiles!conversations_user2_id_fkey(id, display_name, avatar_url, role, status)
        `)
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: 'Failed to create conversation'
        }, { status: 500 });
      }

      conversation = newConversation;
    }

    // 7. 초기 메시지 전송 (있는 경우)
    if (initialMessage && initialMessage.trim()) {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: profile.id,
          content: initialMessage.trim(),
          message_type: 'text'
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
        `)
        .single();

      if (!messageError) {
        newMessage = messageData;
      }
    }

    // 8. 응답 데이터 변환
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
      unread_count: 0
    };

    return NextResponse.json<ApiResponse<CreateConversationResponse>>({
      success: true,
      data: {
        conversation: formattedConversation,
        message: newMessage || undefined
      }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}