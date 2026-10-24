export type VehicleApplication = { vehicleModel: string; yearFrom: number | null; yearTo: number | null }
export type ShockType = 'gas_pressurized' | 'conventional_hydraulic' | 'adjustable'
export type ProductInfo = {
  application: string
  defaultLocation: string
  vehicleApplications?: VehicleApplication[]
  shockType?: ShockType | null
  updatedAt?: string
}

export const shockTypeLabels: Record<ShockType, string> = {
  gas_pressurized: 'Pressurizado a gás',
  conventional_hydraulic: 'Hidráulico convencional',
  adjustable: 'Regulável',
}

// Anos vazios permanecem sem informação; não presumimos um intervalo pelo código.
export function formatVehicleYears(application: VehicleApplication): string {
  if (application.yearFrom === null && application.yearTo === null) return 'Anos não informados'
  if (application.yearFrom === null) return `Até ${application.yearTo}`
  if (application.yearTo === null) return `A partir de ${application.yearFrom}`
  if (application.yearFrom === application.yearTo) return String(application.yearFrom)
  return `${application.yearFrom}–${application.yearTo}`
}

export function searchableProductText(product?: ProductInfo): string {
  if (!product) return ''
  return `${product.application} ${product.shockType ? shockTypeLabels[product.shockType] : ''} ${(product.vehicleApplications ?? []).map((application) => `${application.vehicleModel} ${formatVehicleYears(application)}`).join(' ')}`
}
