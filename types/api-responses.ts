import type { MatchingJob, MatchingResultWithProfile } from './matching';

// API 응답 기본 구조
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 매칭 계산 시작 API 응답
export interface StartMatchingResponse {
  jobId: string;
  message: string;
}

// 매칭 상태 조회 API 응답  
export interface MatchingStatusResponse {
  job: MatchingJob;
}

// 매칭 결과 조회 API 응답
export interface MatchingResultsResponse {
  matches: MatchingResultWithProfile[];
  totalCount: number;
}

// 에러 응답 타입
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}