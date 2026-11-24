import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Instant real-time staleness for guaranteed live DB reflection
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true // Refetches on focus for real-time synchronization
    }
  }
});
