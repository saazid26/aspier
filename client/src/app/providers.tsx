import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/queryClient';
import { useCsrf } from '../hooks/useCsrf';
import { AuthProvider } from '../features/auth/AuthContext';

function CsrfInit({ children }: { children: ReactNode }) {
  useCsrf();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CsrfInit>
          {children}
          <Toaster position="top-right" />
        </CsrfInit>
      </AuthProvider>
    </QueryClientProvider>
  );
}

