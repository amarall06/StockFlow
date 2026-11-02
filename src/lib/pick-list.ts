import type { PickMission } from './pick-missions'

export const pickListHeaders = ['Pedido', 'Cliente', 'Situação da missão', 'Gerado em', 'Missão atualizada em', 'Etapa', 'Prateleira', 'Produto', 'Situação do estoque', 'Código de leitura', 'Solicitado (caixas)', 'Separado (caixas)', 'Pendente (caixas)', 'Escopo']
const labels = { active: 'Em andamento', separated: 'Separação concluída', cancelled: 'CANCELADA - não utilizar para retirada' }
export const pickListNote = 'Cópia local da apresentação. Não registra venda, expedição ou baixa de estoque. Confira a missão atual antes de usar.'
export function createPickList(mission: PickMission, customer: string, generatedAt = new Date().toISOString()) {
  return {
    orderId: mission.orderId, customer, status: labels[mission.status], generatedAt, updatedAt: mission.updatedAt,
    rows: mission.steps.map((step, index) => [mission.orderId, customer, labels[mission.status], generatedAt, mission.updatedAt, index + 1, step.location, step.code, step.status, `LIBER|${step.location}|${step.code}|${step.status === 'Em estoque' ? 'EM_ESTOQUE' : 'LIBERADO'}`, step.quantity, step.counted, step.quantity - step.counted, pickListNote]),
  }
}
export async function createPickListPdf(report: ReturnType<typeof createPickList>): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  let y = 18
  function line(text: string, size = 11) {
    pdf.setFontSize(size)
    for (const part of pdf.splitTextToSize(text, 178) as string[]) {
      if (y > 275) { pdf.addPage(); y = 18 }
      pdf.text(part, 16, y); y += 6
    }
  }
  line('LIBER automotive - Lista de retirada', 16)
  line(`${report.orderId} - ${report.customer}`)
  line(report.status, 13)
  const format = (date: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(date))
  line(`Gerado em: ${format(report.generatedAt)} (America/Bahia)`)
  line(`Missão atualizada em: ${format(report.updatedAt)} (America/Bahia)`)
  line(pickListNote, 10)
  for (const row of report.rows) {
    y += 5
    line(`${row[5]}. ${row[6]} - ${row[7]} - ${row[8]}`, 12)
    line(`Solicitado: ${row[10]} caixas | Separado: ${row[11]} | Pendente: ${row[12]}`)
    line(`Leitura: ${row[9]}`, 10)
  }
  return pdf.output('blob')
}
export function downloadPickListPdf(blob: Blob, orderId: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `liber-retirada-${orderId}.pdf`
  document.body.append(link)
  try { link.click() } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
