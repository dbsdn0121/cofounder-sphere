// src/lib/matching/embedding-service.ts
import type { OnboardingData } from '../../../types/matching';

/**
 * 모든 유저가 같은 모델/차원으로 저장되도록 "단일 진실 소스"를 고정
 * - 운영 시 실제 임베딩 API를 이 모델로 통일해줘.
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIM = 1536;

/**
 * 운영 전환 쉽게 하려고 토글 달아둠.
 * - true: 개발/로컬용 가짜 임베딩(해시) 생성
 * - false: 실제 임베딩 API 호출 위치 (TODO 표시된 곳 구현)
 */
const USE_FAKE_EMBEDDINGS = true;

/** 코사인 유사도 (차원 다르거나 비정상 입력이면 0 반환: 흐름 끊지 않음) */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number.isFinite(a[i]) ? a[i] : 0;
    const y = Number.isFinite(b[i]) ? b[i] : 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 온보딩 데이터를 임베딩용 텍스트로 직렬화 */
function serializeOnboarding(on: OnboardingData): string {
  const parts: string[] = [];
  if (on.industries?.length) parts.push(`industries: ${on.industries.join(', ')}`);
  if (on.goals?.length) parts.push(`goals: ${on.goals.join(', ')}`);
  if (on.partnerRoles?.length) parts.push(`partnerRoles: ${on.partnerRoles.join(', ')}`);
  if (on.expectations?.length) parts.push(`expectations: ${on.expectations.join(', ')}`);
  if (on.collaboration?.length) parts.push(`collaboration: ${on.collaboration.join(', ')}`);
  if (on.teamCulture?.length) parts.push(`teamCulture: ${on.teamCulture.join(', ')}`);
  if (on.timeCommitment) parts.push(`timeCommitment: ${on.timeCommitment}`);
  if (!on.noIdeaYet && on.problemToSolve) parts.push(`problem: ${on.problemToSolve}`);
  if (on.projectName) parts.push(`projectName: ${on.projectName}`);
  return parts.join(' | ');
}

/** 개발/로컬용: 텍스트 해시 → 고정 차원 벡터 */
function fakeHashEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const out = new Array(dim).fill(0);
  const str = text || 'empty';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const idx = code % dim;
    out[idx] += ((code % 13) - 6) / 7; // -~+ 사이 값
  }
  // 간단 정규화
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) out[i] /= norm;
  return out;
}

/** 유저 임베딩 생성 (반드시 EMBEDDING_DIM 길이 보장) */
export async function generateUserEmbedding(onboardingData: OnboardingData): Promise<number[]> {
  const text = serializeOnboarding(onboardingData);

  if (USE_FAKE_EMBEDDINGS) {
    return fakeHashEmbedding(text, EMBEDDING_DIM);
  }

  // TODO: 실제 임베딩 API 호출로 교체
  // 예시 (OpenAI SDK):
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  // const res = await openai.embeddings.create({
  //   model: EMBEDDING_MODEL,
  //   input: text,
  // });
  // const vec = res.data?.[0]?.embedding as number[] | undefined;
  // if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
  //   throw new Error(`Unexpected embedding dim: ${vec?.length}. Expected ${EMBEDDING_DIM}`);
  // }
  // return vec;

  // 임시 방어 (만약 위 구현 전이면 가짜 벡터 반환)
  return fakeHashEmbedding(text, EMBEDDING_DIM);
}
