import './styles/globals.css';


import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

const showReactQueryDevtools =
  import.meta.env.DEV &&
  window.location.pathname !== '/presentation' &&
  window.location.pathname !== '/presentation-cobalt';

const isPresentationPath =
  window.location.pathname === '/presentation' ||
  window.location.pathname === '/presentation-cobalt';

const routedApp = (
  <BrowserRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <App />
  </BrowserRouter>
);

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isPresentationPath ? routedApp : <AuthProvider>{routedApp}</AuthProvider>}
      {showReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
