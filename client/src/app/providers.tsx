import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { useCsrf } from '../hooks/useCsrf';

function CsrfInit({ children }: { children: ReactNode }) {
  useCsrf();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CsrfInit>
        {children}
        <Toaster position="top-right" />
      </CsrfInit>
    </QueryClientProvider>
  );
}

