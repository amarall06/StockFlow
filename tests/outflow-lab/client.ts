// Substitui somente o transporte no servidor local de laboratório.
// O componente e a validação de saídas continuam sendo os arquivos reais do projeto.
export const supabase = {
  async rpc(functionName: string, payload: Record<string, unknown>) {
    try {
      const response = await fetch('/__outflow_lab/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName, payload }),
      })
      return await response.json()
    } catch {
      return { data: null, error: { code: 'NETWORK', message: 'Conexão do laboratório interrompida.' } }
    }
  },
}
