
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data dianggap fresh selama 5 menit
      gcTime: 10 * 60 * 1000,   // Cache disimpan 10 menit sebelum garbage collect
      retry: 2,                 // Retry 2x jika gagal
      refetchOnWindowFocus: false, // Hemat bandwidth
      refetchOnReconnect: true,
    },
  },
});
