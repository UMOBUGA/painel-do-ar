import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Único jeito de capturar erro de render em React 18 é uma class component —
 * não existe hook equivalente. Sem isso, um erro em qualquer componente
 * (Recharts, TanStack Virtual, etc.) derruba a árvore inteira com tela
 * branca em vez do estado de erro que o resto do app já usa.
 *
 * `onError` é o único ponto de integração com um serviço externo de
 * monitoramento (ex.: Sentry). Fica de fora por padrão — plugar é uma linha
 * em `main.tsx` no dia em que existir uma chave real para configurar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      '[painel-do-ar] erro não tratado na árvore de componentes:',
      error,
      info.componentStack,
    )
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="shell">
        <div className="state">
          <h2>Algo quebrou na tela</h2>
          <p>
            Um erro inesperado impediu o painel de continuar. Recarregar a página costuma resolver.
          </p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
