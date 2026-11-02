export const regionalLocations=['NORTE','SUL','LESTE','OESTE']
const previous:Record<string,string>={A01:'NORTE',A03:'NORTE',B01:'SUL',B02:'SUL',C02:'LESTE',D04:'OESTE'}
export function regionalLocation(code:string){return previous[code]??code}
export function regionalOrder(codes:string[]){const unique=[...new Set(codes)];return [...regionalLocations.filter(code=>unique.includes(code)),...unique.filter(code=>!regionalLocations.includes(code)).sort()]}
