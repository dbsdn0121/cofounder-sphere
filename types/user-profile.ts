// 데이터베이스의 profiles 테이블과 매칭되는 타입
export interface UserProfile {
  id: string;
  clerkUserId: string;
  displayName: string;
  headline?: string;
  role?: string;
  status?: string;
  avatarUrl?: string;
  website?: string;
  github?: string;
  x?: string;
  skills: string[];
  workStyles: string[];
  industries: string[];
  vision?: string;
  qualities: string[];
  partnerTraits: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  // 새로 추가된 필드들
  projectPreferences?: OnboardingData;
  textEmbedding?: number[];
  profileVector?: ProfileVector;
}

// 현재 진행중인 프로젝트
export interface CurrentProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: string;
  links: string[];
  createdAt: string;
}

// 완료된 프로젝트  
export interface CompletedProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  links: string[];
  createdAt: string;
}

import type { OnboardingData, ProfileVector } from './matching';