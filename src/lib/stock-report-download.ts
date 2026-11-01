import { stockHeaders, movementHeaders, type StockReport } from './stock-report'

export async function createStockReportFile(report: StockReport, format: 'pdf' | 'xlsx'): Promise<Blob> {
  const note = 'Saldo atual, sem garantia. Movimentações do período; não representa saldo de fechamento histórico.'
  const timestamp = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt))
  if (format === 'xlsx') {
    const { default: writeExcelFile } = await import('write-excel-file/universal')
    const information = [['LIBER automotive — Estoque'], ['Período', report.period], ['Consultado em', timestamp], [note], ['Unidade', 'Caixas'], ['Escopo', 'Dados autorizados para a conta conectada; consultas separadas, sujeitas a movimentações durante a geração.']]
    // Tipo String explícito: textos de cadastro nunca são fórmulas executáveis.
    const cells = (rows: (string | number)[][]) => rows.map(row => row.map(value => typeof value === 'number' ? { type: Number, value } : { type: String, value }))
    return writeExcelFile([
      { sheet: 'Informações', data: cells(information), columns: [{ width: 110 }, { width: 90 }] },
      { sheet: 'Estoque atual', data: cells([stockHeaders, ...report.stock]), columns: stockHeaders.map(() => ({ width: 28 })) },
      { sheet: 'Movimentações', data: cells([movementHeaders, ...report.movements]), columns: movementHeaders.map(() => ({ width: 28 })) },
    ]).toBlob()
  }
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape' })
  let y = 15
  const line = (text: string, size = 10) => {
    pdf.setFontSize(size)
    const lines = pdf.splitTextToSize(text, 265) as string[]
    for (const value of lines) {
      if (y > 193) { pdf.addPage(); y = 15 }
      pdf.text(value, 15, y); y += 5
    }
  }
  line('LIBER automotive - Relatório de estoque', 16)
  line(`Período: ${report.period} | Consultado em: ${timestamp}`)
  line(note)
  line('Unidade: caixas. Dados autorizados para sua conta; consultas separadas, sujeitas a movimentações durante a geração.')
  for (const [title, headers, rows] of [['Estoque atual', stockHeaders, report.stock], ['Movimentações do período', movementHeaders, report.movements]] as const) {
    y += 5; line(title, 13); line(headers.join(' | '))
    if (!rows.length) line('Nenhum registro nesta consulta.')
    for (const row of rows) line(row.map(value => String(value).replace(/[\r\n\t]/g, ' ')).join(' | '))
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page); pdf.setFontSize(9); pdf.text(`${page} / ${pdf.getNumberOfPages()}`, 275, 203)
  }
  return pdf.output('blob')
}

export function downloadReport(blob: Blob, format: 'pdf' | 'xlsx') {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = `liber-estoque-${new Date().toISOString().slice(0, 10)}.${format}`
  document.body.append(anchor)
  try { anchor.click() } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
