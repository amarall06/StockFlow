import { Component, type ReactNode } from 'react'

// Uma falha ao baixar um módulo não deve apagar o menu ou iniciar outra operação.
export class ModuleBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? <ModuleLoadError />
    return this.props.children
  }
}

export function ModuleLoadError() {
  return <section className="inventory-panel module-state" role="alert">
    <h1>Não foi possível abrir esta tela</h1>
    <p>Confira sua conexão e recarregue para obter a versão atual do site. Se havia uma saída com confirmação pendente, use a mesma conta e aba para conferir o pedido após a recarga.</p>
    <button type="button" className="auth-secondary-button" onClick={() => window.location.reload()}>Recarregar site</button>
  </section>
}

export function ModuleLoading() {
  return <p className="module-state" role="status" aria-live="polite">Carregando tela…</p>
}
