import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message } from '../types/messaging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseRealtimeMessagesProps {
  conversationId: string | null;
  onNewMessage: (message: Message) => void;
  onMessageUpdate: (message: Message) => void;
}

export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onMessageUpdate
}: UseRealtimeMessagesProps) {
  const { user } = useUser();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // 기존 채널이 있으면 구독 해제
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // 새 채널 생성 및 구독
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // 새 메시지 데이터 가져오기 (발신자 정보 포함)
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage && !error) {
            // 타입 변환
            const formattedMessage: Message = {
              id: newMessage.id,
              conversation_id: newMessage.conversation_id,
              sender_id: newMessage.sender_id,
              receiver_id: newMessage.receiver_id,
              content: newMessage.content,
              message_type: newMessage.message_type,
              metadata: newMessage.metadata,
              created_at: newMessage.created_at,
              read_at: newMessage.read_at,
              sender: newMessage.sender ? {
                id: newMessage.sender.id,
                display_name: newMessage.sender.display_name,
                avatar_url: newMessage.sender.avatar_url,
                role: newMessage.sender.role,
              } : undefined
            };

            onNewMessage(formattedMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('Message updated:', payload);
          
          // 업데이트된 메시지 데이터 가져오기
          const { data: updatedMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url, role)
            `)
            .eq('id', payload.new.id)
            .single();

          if (updatedMessage && !error) {
            const formattedMessage: Message = {
              id: updatedMessage.id,
              conversation_id: updatedMessage.conversation_id,
              sender_id: updatedMessage.sender_id,
              receiver_id: updatedMessage.receiver_id,
              content: updatedMessage.content,
              message_type: updatedMessage.message_type,
              metadata: updatedMessage.metadata,
              created_at: updatedMessage.created_at,
              read_at: updatedMessage.read_at,
              sender: updatedMessage.sender ? {
                id: updatedMessage.sender.id,
                display_name: updatedMessage.sender.display_name,
                avatar_url: updatedMessage.sender.avatar_url,
                role: updatedMessage.sender.role,
              } : undefined
            };

            onMessageUpdate(formattedMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });

    channelRef.current = channel;

    // 클린업
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, onNewMessage, onMessageUpdate]);

  // 컴포넌트 언마운트 시 구독 해제
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);
}