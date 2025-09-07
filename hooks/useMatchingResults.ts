import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import type { MatchingResultWithProfile } from '../types/matching';

export function useMatchingResults() {
  const { user } = useUser();
  const [matches, setMatches] = useState<MatchingResultWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // 먼저 사용자 프로필 ID 가져오기
        const profileResponse = await fetch('/api/user/profile');
        const profileResult = await profileResponse.json();
        
        if (!profileResult.success) {
          throw new Error('Failed to get user profile');
        }

        const userId = profileResult.data.id;

        // 매칭 결과 가져오기
        const matchResponse = await fetch(`/api/matching/results/${userId}`);
        const matchResult = await matchResponse.json();

        if (matchResult.success && matchResult.data) {
          setMatches(matchResult.data.matches);
        } else {
          // 실제 데이터가 없으면 빈 배열 (mock 데이터 사용 안 함)
          setMatches([]);
        }
      } catch (err) {
        console.error('Failed to fetch matching results:', err);
        setError('Failed to load matches');
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [user]);

  return { matches, loading, error };
}