import type { CSSProperties } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        theme="dark"
        gap={8}
        toastOptions={{
          style: {
            // Map sonner's internal vars to the app's theme tokens.
            '--normal-bg': 'var(--color-modal)',
            '--normal-text': 'var(--color-ink)',
            '--normal-border': 'var(--color-line)',
            // Compact, auto-sized toast instead of sonner's fixed 356px.
            width: 'auto',
            minWidth: '0',
            maxWidth: '320px',
            padding: '8px 12px',
            borderRadius: '0.75rem',
            fontSize: '12px',
            lineHeight: '1.4',
            boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
          } as CSSProperties,
          classNames: {
            toast: 'gap-2',
            title: 'text-xs font-medium text-ink',
            description: 'text-xs text-ink-dim',
            actionButton:
              '!bg-transparent !text-brand hover:!text-brand-hi !px-2 !py-0.5 !h-auto !text-xs !font-medium',
            closeButton: '!bg-modal !border-line !text-ink-dim',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
