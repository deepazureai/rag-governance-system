import useSWR from 'swr';

export interface Application {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
}

export function useApplications() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: Application[] }>(
    '/api/applications',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  return {
    applications: data?.data || [],
    isLoading,
    isError: !!error,
    error,
  };
}
