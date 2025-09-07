import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '../../../../../types/api-responses';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 조인 결과가 배열/객체 둘 다 올 수 있으니 단일 객체로 정규화
function pickOne<T = any>(v: any): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { messageId: string } }   // ✅ Promise 아님
) {
  try {
    const { messageId } = params;

    // 1) 인증
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2) 내 프로필
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

    // 3) 메시지 조회 (metadata 포함 + sender 조인)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, receiver_id, content, message_type, metadata, created_at, read_at,
        sender:profiles!messages_sender_id_fkey ( id, display_name, avatar_url, role )
      `) // ✅ metadata 명시 + 조인
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // 4) 접근 권한 확인 (대화 참여자인지)
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', message.conversation_id)
      .single();

    if (convErr || !conversation ||
        (conversation.user1_id !== profile.id && conversation.user2_id !== profile.id)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 5) 조인 정규화
    const sender = pickOne(message.sender);

    // 6) 응답 포맷
    const formattedMessage = {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      message_type: message.message_type,
      metadata: message.metadata, // ✅ proposal_id 포함해 프론트로 전달
      created_at: message.created_at,
      read_at: message.read_at,
      sender: sender
        ? {
            id: sender.id,
            display_name: sender.display_name,
            avatar_url: sender.avatar_url,
            role: sender.role,
          }
        : undefined,
    };

    return NextResponse.json<ApiResponse<{ message: any }>>({
      success: true,
      data: { message: formattedMessage },
    });
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
