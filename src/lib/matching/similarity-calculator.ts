import type { OnboardingData, ProfileVector } from '../../../types/matching';

/* ------------------------- 입력 정규화 (핵심 방어막) ------------------------- */
type NormalizedOnboarding = {
  industries: string[];
  partnerRoles: string[];
  collaboration: string[];
  goals: string[];
  timeCommitment: string; // 맵핑에서 처리
};

function normalizeOnboarding(d?: Partial<OnboardingData> | null): NormalizedOnboarding {
  return {
    industries: Array.isArray(d?.industries) ? d!.industries : [],
    partnerRoles: Array.isArray(d?.partnerRoles) ? d!.partnerRoles : [],
    collaboration: Array.isArray(d?.collaboration) ? d!.collaboration : [],
    goals: Array.isArray(d?.goals) ? d!.goals : [],
    timeCommitment: typeof d?.timeCommitment === 'string' ? d!.timeCommitment : '',
  };
}

/* -------------------- 온보딩 데이터를 수치 벡터로 변환 -------------------- */
export function createProfileVector(onboardingData: OnboardingData): ProfileVector {
  // ✅ 항상 안전한 형태로 변환
  const data = normalizeOnboarding(onboardingData);

  // 산업 선호도 벡터
  const allIndustries = [
    'AI/Machine Learning', 'DevTools', 'Cybersecurity', 'Cloud/Infrastructure', 'Blockchain',
    'Fintech', 'InsurTech', 'HR/People', 'LegalTech', 'Enterprise SaaS',
    'EdTech', 'Online Learning', 'Skill Development', 'Language Learning', 'Assessment Tools',
    'Digital Health', 'Telemedicine', 'Mental Health', 'Fitness Tech', 'Medical Devices',
    'Clean Energy', 'Carbon Management', 'Sustainable Living', 'Green Transport', 'Circular Economy',
    'E-commerce', 'Social Commerce', 'Supply Chain', 'Consumer Apps', 'Marketplaces',
    'Content Creation', 'Gaming', 'Social Media', 'Streaming', 'Creator Economy',
    'Urban Mobility', 'Logistics', 'Travel Tech', 'Autonomous Systems', 'Delivery Tech'
  ];

  const industryWeights: Record<string, number> = {};
  allIndustries.forEach(industry => {
    industryWeights[industry] = data.industries.includes(industry) ? 1 : 0;
  });

  // 역할 선호도 벡터
  const allRoles = [
    'Developer/Engineer', 'Designer (UI/UX)', 'Product Manager',
    'Business/Marketing', 'Data Scientist', 'Domain Expert'
  ];
  const rolePreferences: Record<string, number> = {};
  allRoles.forEach(role => {
    rolePreferences[role] = data.partnerRoles.includes(role) ? 1 : 0;
  });

  // 협업 스타일 벡터
  const allCollaborationStyles = [
    'Fast iterative execution', 'Regular meetings (1-2x/week)', 'Autonomous role division',
    'Deep discussion focused', 'Data-driven decisions', 'Intuitive and flexible approach'
  ];
  const collaborationStyle: Record<string, number> = {};
  allCollaborationStyles.forEach(style => {
    collaborationStyle[style] = data.collaboration.includes(style) ? 1 : 0;
  });

  // 시간 헌신도 (0-1 스케일)
  const timeCommitmentMap: Record<string, number> = {
    'Light involvement (5-10 hours/week)': 0.25,
    'Side project (10-15 hours/week)': 0.5,
    'Part-time (20-30 hours/week)': 0.75,
    'Full-time (40+ hours/week)': 1.0
  };
  const timeCommitmentLevel = timeCommitmentMap[data.timeCommitment] ?? 0.5; // 기본 0.5

  // 목표 일치도 벡터
  const allGoals = [
    'Launch MVP quickly', 'Build long-term growth foundation', 'Community building',
    'Learn through experimentation', 'Create social impact', 'Pursue technical innovation'
  ];
  const goalAlignment: Record<string, number> = {};
  allGoals.forEach(goal => {
    goalAlignment[goal] = data.goals.includes(goal) ? 1 : 0;
  });

  return {
    industryWeights,
    rolePreferences,
    collaborationStyle,
    timeCommitmentLevel,
    goalAlignment
  };
}

/* -------------------- 두 프로필 벡터 간의 유사도 계산 -------------------- */
export function calculateProfileSimilarity(vector1: ProfileVector, vector2: ProfileVector): number {
  let totalScore = 0;
  let weights = 0;

  // 산업 일치도 (가중치: 30%)
  const industryScore = calculateVectorSimilarity(vector1.industryWeights, vector2.industryWeights);
  totalScore += industryScore * 0.3;
  weights += 0.3;

  // 역할 상호보완성 (가중치: 25%)
  const roleScore = calculateVectorSimilarity(vector1.rolePreferences, vector2.rolePreferences);
  totalScore += roleScore * 0.25;
  weights += 0.25;

  // 협업 스타일 (가중치: 20%)
  const collabScore = calculateVectorSimilarity(vector1.collaborationStyle, vector2.collaborationStyle);
  totalScore += collabScore * 0.2;
  weights += 0.2;

  // 목표 일치도 (가중치: 15%)
  const goalScore = calculateVectorSimilarity(vector1.goalAlignment, vector2.goalAlignment);
  totalScore += goalScore * 0.15;
  weights += 0.15;

  // 시간 헌신도 유사성 (가중치: 10%)
  const timeScore = 1 - Math.abs(vector1.timeCommitmentLevel - vector2.timeCommitmentLevel);
  totalScore += timeScore * 0.1;
  weights += 0.1;

  return Math.round((totalScore / weights) * 100); // 0-100 퍼센트
}

/* ------------------------ 벡터 간 코사인 유사도 ------------------------ */
function calculateVectorSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
  // ✅ 양쪽 키 합집합으로 계산(한쪽에만 있는 키도 반영)
  const keys = new Set<string>([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  keys.forEach(key => {
    const val1 = vec1[key] ?? 0;
    const val2 = vec2[key] ?? 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  });

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
