// lib/types.ts - Supabase 데이터 타입 정의

export interface ProfileData {
  id: string;
  display_name: string;
  headline?: string;
  role?: string;
  skills?: string[];
  industries?: string[];
  avatar_url?: string;
  status?: string;
  vision?: string;
  work_styles?: string[];
  partner_traits?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MatchData {
  id: string;
  match_score: number;
  match_reason?: string[];
  status: string;
  user1_id: string;
  user2_id: string;
  created_at?: string;
  updated_at?: string;
  profiles?: ProfileData; // 단일 프로필 객체
}

export interface MatchWithProfile extends MatchData {
  profiles: ProfileData;
}

// 앱 내부에서 사용하는 매칭 사용자 타입
export interface MatchedUser {
  id: string;
  match_id: string;
  name: string;
  avatar: string;
  role: string;
  headline: string;
  user_status: string;
  match_status: string;
  matchScore: number;
  location: string;
  skills: string[];
  workStyles: string[];
  industries: string[];
  currentProject?: {
    name: string;
    description: string;
    status: string;
  };
  links: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
  followers: string;
  views: string;
  engagement: string;
  isOnline: boolean;
  match_reason: string[];
  vision?: string;
  partner_traits?: string[];
}

// 타입 가드 함수들
export const isValidProfileData = (data: any): data is ProfileData => {
  return data && typeof data.id === 'string' && typeof data.display_name === 'string';
};

export const isValidMatchData = (data: any): data is MatchWithProfile => {
  return data && 
         typeof data.id === 'string' && 
         typeof data.match_score === 'number' &&
         data.profiles &&
         isValidProfileData(data.profiles);
};

// 안전한 데이터 변환 함수
export const convertToMatchedUser = (matchData: MatchWithProfile, index: number = 0): MatchedUser => {
  const profile = matchData.profiles;
  
  return {
    id: profile.id,
    match_id: matchData.id,
    name: profile.display_name,
    avatar: profile.avatar_url || generateFallbackAvatar(index),
    role: profile.role || 'Developer',
    headline: profile.headline || 'Looking for co-founder opportunities',
    user_status: profile.status || 'Student',
    match_status: matchData.status || 'pending',
    matchScore: matchData.match_score || 75,
    location: "Remote",
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    workStyles: Array.isArray(profile.work_styles) ? profile.work_styles : [],
    industries: Array.isArray(profile.industries) ? profile.industries : [],
    currentProject: undefined,
    links: {
      github: undefined,
      linkedin: undefined,
      portfolio: undefined
    },
    followers: `${Math.floor(Math.random() * 500) + 50}K`,
    views: `${Math.floor(Math.random() * 100) + 10}K`,
    engagement: `${Math.floor(Math.random() * 15) + 5}%`,
    isOnline: Math.random() > 0.4,
    match_reason: Array.isArray(matchData.match_reason) ? matchData.match_reason : [],
    vision: profile.vision || '',
    partner_traits: Array.isArray(profile.partner_traits) ? profile.partner_traits : []
  };
};

// 아바타 생성 함수
const generateFallbackAvatar = (index: number): string => {
  const avatarIds = [
    "1507003211169-0a1dd7228f2d",
    "1494790108755-2616c4aa6e23", 
    "1472099645785-5658abf4ff4e",
    "1438761681033-6461ffad8d80",
    "1500648767791-00dcc994a43e",
    "1534528741775-53994a69daeb"
  ];
  const selectedId = avatarIds[index % avatarIds.length];
  return `https://images.unsplash.com/photo-${selectedId}?w=150&h=150&fit=crop&crop=face`;
};