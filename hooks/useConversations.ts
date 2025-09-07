import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Conversation, Message } from '../types/messaging';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 대화 목록 훅
 */
export function useConversations() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/conversations');
      const result = await response.json();

      if (result.success) {
        setConversations(result.data.conversations);
      } else {
        throw new Error(result.error || 'Failed to fetch conversations');
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 실시간 대화방/메시지 변화 → 목록 갱신
  useEffect(() => {
    if (!user) return;

    // 기존 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          await fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async () => {
          await fetchConversations();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { 
    conversations, 
    loading, 
    error, 
    refetch: fetchConversations 
  };
}

/**
 * 특정 대화의 메시지 훅
 * - sendMessage(content, messageType, metadata) 로 메타데이터(JSONB) 포함 전송 가능
 */
export function useConversationMessages(conversationId: string | null) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 새 메시지 수신 처리
  const handleNewMessage = useCallback(async (payload: any) => {
    try {
      const response = await fetch(`/api/messages/${payload.new.id}`);
      const result = await response.json();

      if (result.success) {
        const newMessage = result.data.message as Message;

        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      } else {
        console.error('Failed to fetch message details:', result.error);
      }
    } catch (error) {
      console.error('Error in handleNewMessage:', error);
    }
  }, []);

  // 메시지 업데이트 처리(예: 읽음, 메타 수정 등)
  const handleMessageUpdate = useCallback(async (payload: any) => {
    try {
      const response = await fetch(`/api/messages/${payload.new.id}`);
      const result = await response.json();

      if (result.success) {
        const updatedMessage = result.data.message as Message;
        setMessages(prev =>
          prev.map(msg => (msg.id === updatedMessage.id ? updatedMessage : msg))
        );
      }
    } catch (error) {
      console.error('Error in handleMessageUpdate:', error);
    }
  }, []);

  // 실시간 구독
  useEffect(() => {
    if (!conversationId || !user) return;

    // 기존 채널 해제
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 약간의 지연 후 구독(연결 안정화)
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel(`conversation-${conversationId}`, {
          config: { presence: { key: user.id } },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          handleNewMessage
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', 
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          handleMessageUpdate
        )
        .subscribe();

      channelRef.current = channel;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, handleNewMessage, handleMessageUpdate]);

  // 초기 메시지/대화 로드
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const result = await response.json();

      if (result.success) {
        setMessages(result.data.messages as Message[]);
        setConversation(result.data.conversation as Conversation);
      } else {
        throw new Error(result.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages');
      setMessages([]);
      setConversation(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /**
   * 메시지 전송
   * @param content 텍스트/프로포절 제목 등
   * @param messageType 'text' | 'project_proposal' (기본 'text')
   * @param metadata JSONB로 저장될 부가정보 (e.g., { proposal_id, project_name, ... })
   */
  const sendMessage = async (
    content: string,
    messageType: 'text' | 'project_proposal' = 'text',
    metadata?: any
  ) => {
    if (!conversationId || !content.trim()) return null;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: content.trim(),
          messageType,
          metadata, // ← messages.metadata(jsonb) 로 저장
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Realtime이 INSERT 이벤트로 상태 업데이트를 담당하므로 여기선 반환만
        return result.data.message as Message;
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  };

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    messages,
    conversation,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
