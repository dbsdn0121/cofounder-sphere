// 메시징 시스템 타입 정의

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_content?: string;
  last_message_sender_id?: string;
  // 상대방 정보 (JOIN으로 가져올 때)
  other_user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
    status?: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string; // 기존 호환성용
  content: string;
  message_type: 'text' | 'project_proposal' | 'system';
  metadata?: {
    // 프로젝트 제안 데이터
    project_name?: string;
    description?: string;
    roles?: string[];
    timeline?: string;
    commitment?: string;
    proposal_status?: 'pending' | 'accepted' | 'declined';
  };
  created_at: string;
  read_at?: string;
  // 발신자 정보 (JOIN으로 가져올 때)
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
  };
}

// API 응답 타입들
export interface ConversationsResponse {
  conversations: Conversation[];
  totalCount: number;
}

export interface ConversationMessagesResponse {
  messages: Message[];
  totalCount: number;
  conversation: Conversation;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'project_proposal' | 'system';
  metadata?: Message['metadata'];
}

export interface SendMessageResponse {
  message: Message;
  conversation: Conversation;
}

export interface CreateConversationRequest {
  withUserId: string;
  initialMessage?: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  message?: Message;
}