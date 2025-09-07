import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
  skills: string[];
  industries: string[];
  vision: string;
  work_styles: string[];
  qualities: string[];
  partner_traits: string[];
  status: string;
}

interface MatchResult {
  user_id: string;
  match_score: number;
  reasons: string[];
}

// AI가 두 사용자의 매칭 점수 계산 (사용자에게는 안 보임)
async function calculateAIMatchScore(user1: UserProfile, user2: UserProfile): Promise<MatchResult> {
  const prompt = `
두 스타트업 창업자의 호환성을 0-100점으로 평가해주세요.

사용자 1:
- 역할: ${user1.role}
- 스킬: ${user1.skills.join(', ')}
- 관심 산업: ${user1.industries.join(', ')}
- 비전: ${user1.vision}
- 협업 스타일: ${user1.work_styles.join(', ')}

사용자 2:
- 역할: ${user2.role}
- 스킬: ${user2.skills.join(', ')}
- 관심 산업: ${user2.industries.join(', ')}
- 비전: ${user2.vision}
- 협업 스타일: ${user2.work_styles.join(', ')}

JSON 형태로만 답변하세요:
{
  "score": 0-100 사이의 점수,
  "reasons": ["매칭 이유1", "매칭 이유2"]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "창업자 매칭 전문가입니다. JSON으로만 답변하세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 50, "reasons": []}');
    
    return {
      user_id: user2.id,
      match_score: result.score || 50,
      reasons: result.reasons || []
    };

  } catch (error) {
    console.error('AI 매칭 계산 오류:', error);
    
    // AI 실패 시 간단한 점수 계산
    const skillMatch = user1.skills.filter(skill => user2.skills.includes(skill)).length * 10;
    const industryMatch = user1.industries.filter(industry => user2.industries.includes(industry)).length * 15;
    const roleComplement = (user1.role !== user2.role) ? 20 : 10;
    
    return {
      user_id: user2.id,
      match_score: Math.min(skillMatch + industryMatch + roleComplement, 100),
      reasons: ["공통 관심사", "역할 상호보완"]
    };
  }
}

// 사용자를 위한 AI 매칭 생성 (백그라운드에서 실행)
export async function generateMatches(userId: string): Promise<void> {
  try {
    console.log('🤖 AI 매칭 시작 중...');

    // 현재 사용자 프로필
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!currentUser) {
      console.log('사용자 프로필을 찾을 수 없습니다.');
      return;
    }

    // 다른 사용자들 (최근 가입자 우선, 10명만)
    const { data: otherUsers } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false })
      .limit(10); // AI 비용 절약을 위해 10명만

    if (!otherUsers || otherUsers.length === 0) {
      console.log('매칭할 다른 사용자가 없습니다.');
      return;
    }

    const matches = [];

    // 각 사용자와 AI 매칭 점수 계산
    for (const otherUser of otherUsers) {
      const matchResult = await calculateAIMatchScore(currentUser, otherUser);
      
      // 70점 이상만 매칭으로 저장
      if (matchResult.match_score >= 70) {
        matches.push({
          user1_id: userId,
          user2_id: otherUser.id,
          match_score: matchResult.match_score,
          match_reason: matchResult.reasons,
          status: 'pending'
        });
      }
      
      // API 요청 간격 (Rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 기존 매칭 삭제 후 새로 저장
    await supabase
      .from('matches')
      .delete()
      .eq('user1_id', userId);

    if (matches.length > 0) {
      const { error } = await supabase
        .from('matches')
        .insert(matches);

      if (error) {
        console.error('매칭 저장 오류:', error);
      } else {
        console.log(`✅ ${matches.length}개의 매칭 생성 완료!`);
      }
    } else {
      console.log('70점 이상의 매칭이 없습니다.');
    }

  } catch (error) {
    console.error('AI 매칭 생성 오류:', error);
  }
}

// 사용자의 매칭 목록 가져오기
export async function getUserMatches(userId: string) {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        matched_user:profiles!matches_user2_id_fkey(
          id,
          display_name,
          headline,
          role,
          skills,
          industries,
          avatar_url,
          status
        )
      `)
      .eq('user1_id', userId)
      .order('match_score', { ascending: false });

    if (error) throw error;

    return matches || [];
  } catch (error) {
    console.error('매칭 목록 조회 오류:', error);
    return [];
  }
}