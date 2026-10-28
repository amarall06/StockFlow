// Cada chamada deve aplicar a mesma ordenação total antes de range().
// Avança pelo número recebido: o servidor pode limitar a página abaixo de 500 linhas.
export async function readAllRows<T>(query: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: unknown
}>): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = []
  for (;;) {
    const { data, error } = await query(rows.length, rows.length + 499)
    if (error) return { data: [], error }
    if (!Array.isArray(data)) return { data: [], error: new Error('A consulta chegou incompleta. Atualize o estoque.') }
    if (!data.length) return { data: rows, error: null }
    rows.push(...data)
  }
}
