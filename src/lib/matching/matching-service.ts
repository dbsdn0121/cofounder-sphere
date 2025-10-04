// src/lib/matching/matching-service.ts
import { createClient } from '@supabase/supabase-js';
import { generateUserEmbedding, calculateCosineSimilarity, EMBEDDING_DIM } from './embedding-service';
import { createProfileVector, calculateProfileSimilarity } from './similarity-calculator';
import type { OnboardingData, MatchingJob, MatchingResult } from '../../../types/matching';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

/** 매칭 작업 시작 */
export async function startMatching(userId: string): Promise<string> {
  const { data: job, error } = await supabase
    .from('matching_jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      progress: 0,
      current_step: 'embedding'
    })
    .select()
    .single();

  if (error || !job) {
    throw new Error('Failed to create matching job');
  }

  // 백그라운드 처리 실행 (await 하지 않음)
  processMatching(job.id, userId).catch(err => {
    console.error('Matching process failed:', err);
    updateJobStatus(job.id, 'failed', 0, 'embedding', err?.message ?? String(err));
  });

  return job.id;
}

/** 매칭 프로세스 본체 */
async function processMatching(jobId: string, userId: string): Promise<void> {
  try {
    await updateJobStatus(jobId, 'processing', 10, 'embedding');

    // 1) 내 프로필/온보딩/임베딩
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('project_preferences, text_embedding')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      throw new Error('User profile not found');
    }

    const onboardingData = userProfile.project_preferences as OnboardingData | null;
    if (!onboardingData) {
      throw new Error('Onboarding data not found');
    }

    // 내 임베딩 준비: 없거나 차원 다르면 재생성
    let userEmbedding: number[] | null = Array.isArray(userProfile.text_embedding)
      ? userProfile.text_embedding
      : null;

    const userEmbBad =
      !userEmbedding ||
      !Array.isArray(userEmbedding) ||
      userEmbedding.length !== EMBEDDING_DIM;

    if (userEmbBad) {
      await updateJobStatus(jobId, 'processing', 30, 'embedding');
      userEmbedding = await generateUserEmbedding(onboardingData);
      await supabase
        .from('profiles')
        .update({ text_embedding: userEmbedding })
        .eq('id', userId);
    }

    // 2) 다른 유저들 조회
    await updateJobStatus(jobId, 'processing', 50, 'calculating');

    const { data: otherUsers, error: othersError } = await supabase
      .from('profiles')
      .select('id, project_preferences, text_embedding')
      .neq('id', userId)
      .eq('onboarding_completed', true);

    if (othersError || !otherUsers) {
      throw new Error('Failed to fetch other users');
    }

    // 3) 유사도 계산
    const matches: Array<{ userId: string; score: number; textSimilarity: number }> = [];
    const userVector = createProfileVector(onboardingData);

    for (const other of otherUsers) {
      if (!other.project_preferences) continue;

      const otherOnboardingData = other.project_preferences as OnboardingData;
      const otherVector = createProfileVector(otherOnboardingData);

      // (a) 프로필 벡터 유사도(주점)
      const profileScore = calculateProfileSimilarity(userVector, otherVector); // 0~100

      // (b) 텍스트 임베딩 유사도(보조점)
      let otherEmbedding: number[] | null = Array.isArray(other.text_embedding)
        ? other.text_embedding
        : null;

      const otherEmbBad =
        !otherEmbedding ||
        !Array.isArray(otherEmbedding) ||
        otherEmbedding.length !== EMBEDDING_DIM;

      if (otherEmbBad) {
        // 차원 불일치/누락 → 재임베딩 & 저장
        try {
          otherEmbedding = await generateUserEmbedding(otherOnboardingData);
          await supabase
            .from('profiles')
            .update({ text_embedding: otherEmbedding })
            .eq('id', other.id);
        } catch {
          otherEmbedding = null; // 실패하면 텍스트 유사도 0
        }
      }

      let textScore = 0;
      if (userEmbedding && otherEmbedding && userEmbedding.length === otherEmbedding.length) {
        textScore = calculateCosineSimilarity(userEmbedding, otherEmbedding) * 100; // 0~100
      }

      const finalScore = Math.round(profileScore * 0.9 + textScore * 0.1);
      matches.push({ userId: other.id, score: finalScore, textSimilarity: textScore });
    }

    // 4) 정렬/랭킹
    await updateJobStatus(jobId, 'processing', 80, 'ranking');
    matches.sort((a, b) => b.score - a.score);

    // 5) 저장
    const rows = matches.map((m, i) => ({
      user1_id: userId,
      user2_id: m.userId,
      match_percentage: m.score,
      rank: i + 1
    }));

    await supabase.from('matches').delete().eq('user1_id', userId);
    const { error: insertError } = await supabase.from('matches').insert(rows);
    if (insertError) {
      throw new Error('Failed to save matching results');
    }

    await updateJobStatus(jobId, 'completed', 100, 'ranking');
  } catch (err) {
    console.error('Matching process error:', err);
    // 상태만 실패로 남기고 throw는 상위에서 이미 처리되므로 여기선 마무리
    await updateJobStatus(
      jobId,
      'failed',
      0,
      'calculating',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** 작업 상태 업데이트 */
async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  currentStep: string,
  errorMessage?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    progress,
    current_step: currentStep
  };

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  await supabase
    .from('matching_jobs')
    .update(updateData)
    .eq('id', jobId);
}

/** 상태 조회: snake→camel 별칭으로 타입 안전 매핑 */
export async function getMatchingStatus(jobId: string): Promise<MatchingJob | null> {
  const { data, error } = await supabase
    .from('matching_jobs')
    .select(`
      id,
      userId:user_id,
      status,
      progress,
      currentStep:current_step,
      completedAt:completed_at,
      errorMessage:error_message
    `)
    .eq('id', jobId)
    .single();

  if (error || !data) return null;
  return data as MatchingJob;
}

/** 결과 조회 (간단 버전: matches 테이블만) */
export async function getMatchingResults(userId: string): Promise<MatchingResult[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user1_id', userId)
    .order('rank', { ascending: true });

  if (error || !data) return [];
  return data as MatchingResult[];
}
