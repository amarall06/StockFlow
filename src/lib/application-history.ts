import { formatVehicleYears, shockTypeLabels, type ShockType, type VehicleApplication } from './product-details'

export type ApplicationSnapshot = { shockType: ShockType | null; applications: VehicleApplication[] }
export type ApplicationHistoryRecord = {
  id: string
  product_code: string
  change_kind: 'baseline' | 'updated'
  details_before: ApplicationSnapshot | null
  details_after: ApplicationSnapshot
  performed_by: string | null
  actor_display_name: string | null
  actor_current_name?: string
  created_at: string
}

const applicationIdentity = (application: VehicleApplication) => JSON.stringify([application.vehicleModel, application.yearFrom, application.yearTo])
const applicationLabel = (application: VehicleApplication) => `${application.vehicleModel} · ${formatVehicleYears(application)}`

// Compara as duas versões sem confundir uma alteração de cadastro com movimento de estoque.
export function applicationChangeLines(record: ApplicationHistoryRecord): string[] {
  if (record.change_kind === 'baseline') return ['Cadastro existente registrado como ponto de partida do histórico.']
  const before = record.details_before ?? { shockType: null, applications: [] }
  const after = record.details_after
  const lines: string[] = []
  if (before.shockType !== after.shockType) {
    lines.push(`Tipo: ${before.shockType ? shockTypeLabels[before.shockType] : 'Não informado'} → ${after.shockType ? shockTypeLabels[after.shockType] : 'Não informado'}`)
  }
  const oldApplications = new Set(before.applications.map(applicationIdentity))
  const newApplications = new Set(after.applications.map(applicationIdentity))
  for (const application of before.applications) {
    if (!newApplications.has(applicationIdentity(application))) lines.push(`Removida: ${applicationLabel(application)}`)
  }
  for (const application of after.applications) {
    if (!oldApplications.has(applicationIdentity(application))) lines.push(`Incluída: ${applicationLabel(application)}`)
  }
  if (JSON.stringify(before.applications) !== JSON.stringify(after.applications)
    && oldApplications.size === newApplications.size
    && [...oldApplications].every((identity) => newApplications.has(identity))) {
    lines.push('Ordem de apresentação das aplicações alterada.')
  }
  return lines.length ? lines : ['Cadastro atualizado.']
}
