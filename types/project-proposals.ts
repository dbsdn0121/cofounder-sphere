// 프로젝트 제안 관련 타입 정의

export interface ProjectProposal {
  id: string;
  conversation_id: string;
  proposer_id: string;
  receiver_id: string;
  project_name: string;
  description?: string;
  roles: string[];
  timeline?: string;
  commitment?: string;
  status: 'pending' | 'accepted' | 'declined';
  message_id?: string;
  created_at: string;
  responded_at?: string;
  response_message?: string;
  // JOIN으로 가져올 때 추가 정보
  proposer?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
  };
  receiver?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface ProjectTeam {
  id: string;
  proposal_id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ProjectTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role?: string;
  status: 'active' | 'inactive' | 'left';
  is_admin: boolean;
  joined_at: string;
  // JOIN으로 가져올 때 사용자 정보
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    role?: string;
  };
}

// API 요청/응답 타입들
export interface CreateProposalRequest {
  conversationId: string;
  receiverId: string;
  projectName: string;
  description?: string;
  roles: string[];
  timeline?: string;
  commitment?: string;
}

export interface CreateProposalResponse {
  proposal: ProjectProposal;
  message: any; // Message 타입은 기존 messaging.ts에서 가져옴
}

export interface RespondToProposalRequest {
  response: 'accepted' | 'declined';
  responseMessage?: string;
}

export interface RespondToProposalResponse {
  proposal: ProjectProposal;
  team?: ProjectTeam;
  message: any;
}

export interface GetProposalsResponse {
  proposals: ProjectProposal[];
  totalCount: number;
}

export interface GetTeamResponse {
  team: ProjectTeam;
  members: ProjectTeamMember[];
  proposal: ProjectProposal;
}