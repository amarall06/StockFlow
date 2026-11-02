// Consulta só os produtos sem evento na janela, com até quatro leituras simultâneas.
// Uma leitura recusada não equivale a produto sem histórico.
export async function lastProductMovements(codes: string[], start: string,
  fetchLast: (code: string) => Promise<{ code: string; created_at: string } | null>) {
  const result: Record<string, string | null> = {}
  const pending = [...new Set(codes)]
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (next < pending.length) {
      const code = pending[next++]
      const row = await fetchLast(code)
      if (row && (row.code !== code || !Number.isFinite(Date.parse(row.created_at)) || Date.parse(row.created_at) >= Date.parse(start))) {
        throw new Error('Última movimentação inválida. Atualize para tentar novamente.')
      }
      result[code] = row?.created_at ?? null
    }
  }))
  return result
}
