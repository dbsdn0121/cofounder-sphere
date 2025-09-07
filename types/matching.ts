// 온보딩에서 수집하는 데이터 구조
export interface OnboardingData {
  industries: string[];
  problemToSolve: string;
  noIdeaYet: boolean;
  goals: string[];
  partnerRoles: string[];
  expectations: string[];
  collaboration: string[];
  timeCommitment: string;
  teamCulture: string[];
  projectName: string;
  decideWithPartner: boolean;
}

// 계산된 사용자 특성 벡터
export interface ProfileVector {
  industryWeights: Record<string, number>; // 산업별 선호도 0-1
  rolePreferences: Record<string, number>; // 역할별 선호도 0-1
  collaborationStyle: Record<string, number>; // 협업 스타일 0-1
  timeCommitmentLevel: number; // 시간 헌신도 0-1
  goalAlignment: Record<string, number>; // 목표별 선호도 0-1
}

// 매칭 작업 상태
export interface MatchingJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: 'embedding' | 'calculating' | 'ranking';
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// 매칭 결과
export interface MatchingResult {
  id: string;
  userId: string;
  matchedUserId: string;
  matchPercentage: number; // 0-100
  rank: number;
  createdAt: string;
}

// API 응답용 매칭 결과 (사용자 정보 포함)
export interface MatchingResultWithProfile {
  id: string;
  matchPercentage: number;
  rank: number;
  profile: {
    id: string;
    displayName: string;
    headline?: string;
    role?: string;
    status?: string;
    avatarUrl?: string;
    skills: string[];
    workStyles: string[];
    industries: string[];
    currentProjects?: Array<{
      name: string;
      description: string;
      status: string;
    }>;
    github?: string;
    linkedin?: string;
    website?: string;
  };
}