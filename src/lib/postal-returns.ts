export const samplePostalReturns = [
  {id:'RET-2001',shipment:'REM-401',customer:'Oficina Horizonte',code:'AGM-35',expected:4},
  {id:'RET-2002',shipment:'REM-402',customer:'Auto Peças Central',code:'MGM-35',expected:3},
  {id:'RET-2003',shipment:'REM-403',customer:'Oficina Avenida',code:'AGM-35',expected:2},
]
export const postalConditionLabels = {intact:'Íntegro e quantidade confere',damaged:'Volume com avaria',mismatch:'Quantidade ou identificação divergente'}
export type PostalCondition = keyof typeof postalConditionLabels
export type PostalReceipt = {id:string;counted:number;condition:PostalCondition;notes:string;receiptConfirmed:true;recordedAt:string;status:'awaiting-review'}
export type PostalReturnState = {version:1;userId:string;receipts:Record<string,PostalReceipt>}
function validateReceipt(receipt:PostalReceipt){
  const source=samplePostalReturns.find(row=>row.id===receipt?.id)
  if(!source||!Number.isSafeInteger(receipt.counted)||receipt.counted<0||receipt.counted>source.expected||!Object.hasOwn(postalConditionLabels,receipt.condition)||typeof receipt.notes!=='string'||receipt.notes.trim().length<5||receipt.notes.length>500||receipt.receiptConfirmed!==true||receipt.status!=='awaiting-review'||!Number.isFinite(Date.parse(receipt.recordedAt)))throw Error('Conferência de retorno inválida. Preserve os dados para revisão.')
  if(receipt.condition==='intact'&&receipt.counted!==source.expected)throw Error('A quantidade não confere. Registre a divergência ou avaria antes de salvar.')
}
export function parsePostalReturns(raw:string|null,userId:string):PostalReturnState{
  if(raw===null)return{version:1,userId,receipts:{}}
  const state=JSON.parse(raw) as PostalReturnState
  if(!state||state.version!==1||state.userId!==userId||!state.receipts||typeof state.receipts!=='object'||Array.isArray(state.receipts)||Object.keys(state.receipts).length>samplePostalReturns.length)throw Error('Retornos locais inválidos. Preserve os dados para revisão.')
  for(const[id,receipt]of Object.entries(state.receipts)){validateReceipt(receipt);if(id!==receipt.id)throw Error('Identificação do retorno inválida.')}
  return state
}
export function receivePostalReturn(state:PostalReturnState,id:string,counted:number,condition:PostalCondition,notes:string,confirmed:boolean):PostalReturnState{
  if(Object.hasOwn(state.receipts,id))throw Error('Este retorno já foi registrado. Confira o registro existente; não receba duas vezes.')
  if(!confirmed)throw Error('Confirme a conferência do volume retornado e da quantidade recebida.')
  const receipt:PostalReceipt={id,counted,condition,notes:notes.trim(),receiptConfirmed:true,recordedAt:new Date().toISOString(),status:'awaiting-review'}
  validateReceipt(receipt)
  return{...state,receipts:{...state.receipts,[id]:receipt}}
}
export const postalReturnsKey=(userId:string)=>`liber:postal-returns:v1:${userId}`
export function readPostalReturnsRaw(userId:string){try{return localStorage.getItem(postalReturnsKey(userId))}catch{return '!unavailable'}}
export function subscribePostalReturns(listener:()=>void){
  for(const event of ['storage','focus','liber:postal-returns'])window.addEventListener(event,listener)
  return()=>{for(const event of ['storage','focus','liber:postal-returns'])window.removeEventListener(event,listener)}
}
export function savePostalReturns(state:PostalReturnState,expected:string|null){
  if(!state.userId||readPostalReturnsRaw(state.userId)!==expected)throw Error('Os retornos mudaram em outra aba. Confira o registro atual antes de salvar.')
  const raw=JSON.stringify(state);parsePostalReturns(raw,state.userId)
  localStorage.setItem(postalReturnsKey(state.userId),raw)
  if(readPostalReturnsRaw(state.userId)!==raw)throw Error('O navegador não confirmou a gravação do retorno.')
  window.dispatchEvent(new Event('liber:postal-returns'))
}
