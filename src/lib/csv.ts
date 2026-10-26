export type CsvCell = string | number | null | undefined

// Textos de cadastro não podem virar fórmulas quando abertos em uma planilha.
export function csvCell(value: CsvCell): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('O relatório contém um número inválido.')
    return String(value).replace('.', ',')
  }
  let text = String(value ?? '').replaceAll('\u0000', '')
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || ['\t','\r','\n'].includes(text[0] ?? '')) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function createCsv(headers: string[], rows: CsvCell[][]): string {
  if (!headers.length || rows.some(row => row.length !== headers.length)) throw new Error('As colunas do relatório estão inconsistentes.')
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n'
}

export function downloadCsv(name: string, headers: string[], rows: CsvCell[][]): void {
  const csv = createCsv(headers, rows)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  link.href = url
  link.download = `${name.replace(/[^a-z0-9-]/gi, '-')}-${day}.csv`
  document.body.append(link)
  try { link.click() }
  finally {
    link.remove()
    // Libera o endereço temporário depois que o navegador inicia o download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
