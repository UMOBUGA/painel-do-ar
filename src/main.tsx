import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
})

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado no HTML.')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
