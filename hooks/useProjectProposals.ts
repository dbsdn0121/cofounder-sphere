import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { ProjectProposal, CreateProposalRequest, RespondToProposalRequest } from '../types/project-proposals';

export function useProjectProposals() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = async (proposalData: CreateProposalRequest) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData)
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create proposal');
      }
    } catch (err) {
      console.error('Failed to create proposal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const respondToProposal = async (proposalId: string, responseData: RespondToProposalRequest) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${proposalId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData)
      });

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to respond to proposal');
      }
    } catch (err) {
      console.error('Failed to respond to proposal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to proposal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProposals = async (filters?: {
    status?: 'pending' | 'accepted' | 'declined';
    type?: 'sent' | 'received' | 'all';
    limit?: number;
    offset?: number;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/projects/proposals?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch proposals');
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch proposals';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTeam = async (teamId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch team');
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProposal,
    respondToProposal,
    getProposals,
    getTeam,
    loading,
    error
  };
}