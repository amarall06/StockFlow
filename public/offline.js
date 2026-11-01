const prefix = 'liber:offline-stock:v1:'
const clear = () => { for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key) }
let suppliers = []; let stock = [], locations = [], warranty = [], customerReturns = [], returnEditBase = null
function render() {
  const target = document.getElementById('rows'); target.replaceChildren()
  const filter = document.getElementById('filter').value.trim().toUpperCase()
  for (const row of stock.filter(row => `${row.code} ${row.location}`.toUpperCase().includes(filter))) {
    const tr = document.createElement('tr')
    for (const value of [row.code, row.location, row.status, row.boxes]) { const td = document.createElement('td'); td.textContent = String(value); tr.append(td) }
    target.append(tr)
  }
}
function check() {
  try {
    const userId = localStorage.getItem(prefix + 'account')
    const value = JSON.parse(localStorage.getItem(prefix + userId) || 'null')
    if (!value || value.userId !== userId || !Number.isFinite(value.consultedAt) || value.consultedAt > Date.now() || value.expiresAt !== value.consultedAt + 900000 || Date.now() >= value.expiresAt || !Array.isArray(value.stock) || value.stock.some(row => !row || typeof row.code !== 'string' || typeof row.location !== 'string' || typeof row.status !== 'string' || !Number.isSafeInteger(row.boxes) || row.boxes < 0)) throw Error()
    customerReturns = value.customerReturns?.expiresAt > Date.now() && Array.isArray(value.customerReturns.rows) ? value.customerReturns.rows.filter(row=>row && typeof row.id==='string' && typeof row.updated_at==='string' && row.status!=='closed') : []; warranty = value.warranty?.expiresAt > Date.now() && Array.isArray(value.warranty.rows) ? value.warranty.rows.filter(row=>row && typeof row.id==='string' && typeof row.name==='string' && Number.isSafeInteger(row.shock_boxes) && row.shock_boxes>=0 && Number.isSafeInteger(row.spring_boxes) && row.spring_boxes>=0) : []; suppliers = value.suppliers?.expiresAt > Date.now() && Array.isArray(value.suppliers.rows) ? value.suppliers.rows.filter(row=>row && typeof row.id==='string' && typeof row.name==='string') : []; stock = value.stock; locations = Array.isArray(value.locations) ? value.locations.filter(code => typeof code === 'string') : []
    document.getElementById('state').textContent = `Consulta de ${new Date(value.consultedAt).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}. Disponível por até 15 minutos após a sincronização.`
  } catch { stock = []; suppliers = []; locations = []; warranty = []; customerReturns = []; clear(); document.getElementById('state').textContent = 'Não há consulta offline válida. Conecte-se e abra o estoque novamente.' }
  render(); refreshSuppliers(); refreshDraftSources(); refreshReceiptSources(); refreshTransferSources(); refreshWarrantySources(); refreshReturnEditSources(); refreshTestSources(); refreshNewProductLocations()
}
document.getElementById('filter').addEventListener('input', render)
document.getElementById('clear').addEventListener('click', () => { clear(); check() })
window.addEventListener('storage', check)
check(); setInterval(check, 1000)

function refreshDraftSources() {
 const select=document.getElementById('source'), selected=select.value
 select.replaceChildren()
 stock.forEach((row,index)=>{
  if (!(document.getElementById('draft-reason').value==='sale'?['Liberado para venda','Em estoque']:['Aguardando testagem','Liberado para venda','Em estoque']).includes(row.status)||row.boxes<1)return
  const option=document.createElement('option');option.value=String(index);option.textContent=`${row.code} · ${row.location} · ${row.boxes} caixas consultadas`;select.append(option)
 })
 if([...select.options].some(option=>option.value===selected))select.value=selected
 document.getElementById('draft').disabled=!select.options.length
}
document.getElementById('draft').addEventListener('click',()=>{
 const message=document.getElementById('draft-state')
 try {
  check()
  const userId=localStorage.getItem(prefix+'account'),row=stock[Number(document.getElementById('source').value)]
  const reason=document.getElementById('draft-reason').value,boxes=Number(document.getElementById('boxes').value),notes=document.getElementById('notes').value.trim()
  if(!userId||!row||!(reason==='sale'?['Liberado para venda','Em estoque']:['Aguardando testagem','Liberado para venda','Em estoque']).includes(row.status)||!Number.isSafeInteger(boxes)||boxes<1||boxes>row.boxes||notes.length>500||!['sale','discard','supplier_return'].includes(reason)||(reason!=='sale'&&!notes))throw Error('Confira o saldo consultado e informe caixas inteiras dentro dele.')
  const key=`liber:offline-operations:v1:${userId}`, rows=JSON.parse(localStorage.getItem(key)||'[]')
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os rascunhos existentes antes de acrescentar outro.')
  const operation={id:crypto.randomUUID(),userId,code:row.code,location:row.location,status:row.status,boxes,notes,reason,createdAt:Date.now()}
  if(rows.some(item=>item.userId===userId&&item.code===row.code&&item.location===row.location&&item.status===row.status&&item.boxes===boxes&&item.notes===notes&&(item.reason??'sale')===reason)){message.textContent='Já existe um rascunho igual neste aparelho. Confira-o antes de repetir.';return}
  rows.push(operation);const saved=JSON.stringify(rows);localStorage.setItem(key,saved)
  if(localStorage.getItem(key)!==saved)throw Error('O aparelho não confirmou a gravação.')
  message.textContent=`Rascunho guardado neste aparelho: ${operation.id}. Nenhuma caixa foi retirada ou reservada.`
 }catch(error){message.textContent=error.message||'Não foi possível guardar o rascunho.'}
})
refreshDraftSources()

function refreshReceiptSources(){
 const select=document.getElementById('receipt-source'),selected=select.value;select.replaceChildren()
 stock.forEach((row,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${row.code} · ${row.location}`;select.append(option)})
 if([...select.options].some(option=>option.value===selected))select.value=selected
 document.getElementById('receipt-draft').disabled=!select.options.length
}
document.getElementById('receipt-draft').addEventListener('click',()=>{
 const message=document.getElementById('receipt-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),row=stock[Number(document.getElementById('receipt-source').value)],boxes=Number(document.getElementById('receipt-boxes').value)
  if(!userId||!row||!Number.isSafeInteger(boxes)||boxes<1||boxes>2147483647)throw Error('Confira o produto/local e a quantidade inteira positiva.')
  const key=`liber:offline-receipts:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]')
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os rascunhos existentes antes de acrescentar outro.')
  const input={code:row.code,application:'',location:row.location,boxes,status:/^(MGM|MFI|MRE|MFR)-/.test(row.code)?'in_stock':'awaiting_test',supplierId:document.getElementById('receipt-supplier').value,lot:document.getElementById('receipt-lot').value.trim()}
  if((input.lot&&!input.supplierId)||input.lot.length>100||(input.supplierId&&!suppliers.some(row=>row.id===input.supplierId)))throw Error('Para informar lote, escolha fornecedor de consulta válida.');
  if(rows.some(item=>JSON.stringify(item.input)===JSON.stringify(input))){message.textContent='Já existe uma entrada igual neste aparelho. Confira-a antes de repetir.';return}
  const draft={id:crypto.randomUUID(),userId,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value)
  if(localStorage.getItem(key)!==value)throw Error('O aparelho não confirmou a gravação.')
  message.textContent=`Entrada guardada para conferência: ${draft.id}. Nenhuma caixa foi acrescentada ao saldo.`
 }catch(error){message.textContent=error.message||'Falha ao guardar entrada.'}
})
refreshReceiptSources()

function refreshTransferSources(){
 const source=document.getElementById('transfer-source'),to=document.getElementById('transfer-to'),selected=source.value,target=to.value
 source.replaceChildren();to.replaceChildren()
 stock.forEach((row,index)=>{if(row.boxes<1)return;const option=document.createElement('option');option.value=String(index);option.textContent=`${row.code} · ${row.location} · ${row.status}`;source.append(option)})
 locations.forEach(code=>{const option=document.createElement('option');option.value=code;option.textContent=code;to.append(option)})
 if([...source.options].some(option=>option.value===selected))source.value=selected
 if([...to.options].some(option=>option.value===target))to.value=target
 document.getElementById('transfer-draft').disabled=!source.options.length||!to.options.length
}
document.getElementById('transfer-draft').addEventListener('click',()=>{
 const message=document.getElementById('transfer-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),row=stock[Number(document.getElementById('transfer-source').value)],to=document.getElementById('transfer-to').value,boxes=Number(document.getElementById('transfer-boxes').value)
  if(!userId||!row||!locations.includes(to)||row.location===to||!Number.isSafeInteger(boxes)||boxes<1||boxes>row.boxes)throw Error('Confira origem, destino diferente e quantidade inteira dentro do saldo consultado.')
  const key=`liber:offline-transfers:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]'),input={row:{...row},to,boxes}
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os rascunhos existentes antes de acrescentar outro.')

  if(rows.some(item=>JSON.stringify(item.input)===JSON.stringify(input))){message.textContent='Já existe uma transferência igual neste aparelho.';return}
  const draft={id:crypto.randomUUID(),userId,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value)
  if(localStorage.getItem(key)!==value)throw Error('O aparelho não confirmou a gravação.')
  message.textContent=`Transferência guardada para conferência: ${draft.id}. Nenhum saldo foi alterado.`
 }catch(error){message.textContent=error.message||'Falha ao guardar transferência.'}
})
refreshTransferSources()

function refreshWarrantySources(){const select=document.getElementById('warranty-source'),selected=select.value;select.replaceChildren();warranty.forEach(row=>{const option=document.createElement('option');option.value=row.id;option.textContent=row.name;select.append(option)});if([...select.options].some(option=>option.value===selected))select.value=selected;document.getElementById('warranty-draft').disabled=!select.options.length}
document.getElementById('warranty-draft').addEventListener('click',()=>{
 const message=document.getElementById('warranty-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),manufacturerId=document.getElementById('warranty-source').value,kind=document.getElementById('warranty-kind').value,direction=document.getElementById('warranty-direction').value,quantity=Number(document.getElementById('warranty-boxes').value),note=document.getElementById('warranty-note').value.trim(),manufacturer=warranty.find(row=>row.id===manufacturerId)
  if(!userId||!manufacturer||!['shock','spring'].includes(kind)||!['in','out'].includes(direction)||!Number.isSafeInteger(quantity)||quantity<1||quantity>2147483647||note.length>500||(direction==='out'&&quantity>(kind==='shock'?manufacturer.shock_boxes:manufacturer.spring_boxes)))throw Error('Confira fabricante, direção e quantidade dentro do saldo consultado para saída.')
  const key=`liber:offline-warranty:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]'),input={manufacturerId,kind,direction,quantity,note}
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os pedidos existentes antes de acrescentar outro.')
  if(rows.some(row=>JSON.stringify(row.input)===JSON.stringify(input))){message.textContent='Já existe uma operação de garantia igual neste aparelho.';return}
  const draft={id:crypto.randomUUID(),userId,manufacturerName:manufacturer.name,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.')
  message.textContent=`Garantia guardada para conferência: ${draft.id}. Nenhum saldo foi alterado.`
 }catch(error){message.textContent=error.message||'Falha ao guardar garantia.'}
})
refreshWarrantySources()

 document.getElementById('return-draft').addEventListener('click',()=>{
 const message=document.getElementById('return-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),description=document.getElementById('return-description').value.trim(),reason=document.getElementById('return-reason').value.trim(),location=document.getElementById('return-location').value.trim(),boxes=Number(document.getElementById('return-boxes').value)
  if(!userId||!description||description.length>300||!reason||reason.length>500||!location||location.length>100||!Number.isSafeInteger(boxes)||boxes<1||boxes>2147483647)throw Error('Confira descrição, motivo, local e quantidade inteira positiva.')
  const key=`liber:offline-customer-returns:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]'),input={manufacturer_id:null,product_kind:'unknown',product_code:'',description,boxes,reason,location,ownership:'unknown',status:'received',destination:''}
  if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os pedidos existentes antes de acrescentar outro.')
  if(rows.some(row=>JSON.stringify(row.input)===JSON.stringify(input))){message.textContent='Já existe uma devolução igual neste aparelho.';return}
  const draft={id:crypto.randomUUID(),returnId:crypto.randomUUID(),userId,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.')
  message.textContent=`Devolução guardada para conferência: ${draft.id}. Nenhum saldo foi alterado.`
 }catch(error){message.textContent=error.message||'Falha ao guardar devolução.'}
})

function refreshReturnEditSources(){const select=document.getElementById('return-edit-source'),selected=select.value;select.replaceChildren();customerReturns.forEach(row=>{const option=document.createElement('option');option.value=row.id;option.textContent=row.description;select.append(option)});if([...select.options].some(option=>option.value===selected))select.value=selected;document.getElementById('return-edit-draft').disabled=!select.options.length;if(select.value!==selected)fillReturnEdit()}
function fillReturnEdit(){const row=customerReturns.find(row=>row.id===document.getElementById('return-edit-source').value);if(!row)return;returnEditBase=JSON.parse(JSON.stringify(row));for(const [field,key] of [['code','product_code'],['description','description'],['reason','reason'],['location','location'],['boxes','boxes'],['kind','product_kind'],['ownership','ownership'],['status','status'],['destination','destination']])document.getElementById('return-edit-'+field).value=row[key];const select=document.getElementById('return-edit-manufacturer');select.replaceChildren();for(const item of [{id:'',name:'Não identificado'},...warranty,...(row.manufacturer_id&&!warranty.some(item=>item.id===row.manufacturer_id)?[{id:row.manufacturer_id,name:'Fabricante vinculado'}]:[])]){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option)}select.value=row.manufacturer_id||'';for(const field of ['code','boxes','kind','ownership','manufacturer'])document.getElementById('return-edit-'+field).disabled=row.status==='warranty'}
document.getElementById('return-edit-source').addEventListener('change',fillReturnEdit)
document.getElementById('return-edit-draft').addEventListener('click',()=>{
 const message=document.getElementById('return-edit-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),available=customerReturns.find(row=>row.id===document.getElementById('return-edit-source').value),previous=returnEditBase;if(!userId||!available||!previous||previous.id!==available.id)throw Error('Atualize a consulta de devoluções antes de preparar alteração.')
  const get=field=>document.getElementById('return-edit-'+field).value.trim(),input={manufacturer_id:get('manufacturer')||null,product_kind:get('kind'),product_code:get('code'),description:get('description'),boxes:Number(get('boxes')),reason:get('reason'),location:get('location'),ownership:get('ownership'),status:get('status'),destination:get('destination')}
  if(!input.description||!input.reason||!input.location||!Number.isSafeInteger(input.boxes)||input.boxes<1||input.boxes>2147483647||(input.status==='closed'&&!input.destination)||(input.status==='warranty'&&(!input.manufacturer_id||input.ownership!=='ours'||input.product_kind==='unknown'))||(['awaiting_test','identification'].includes(input.status)&&(input.product_kind!=='shock'||input.ownership!=='ours'))||previous.status==='closed')throw Error('Confira campos, andamento e destino. Molas não passam por testagem.')
  if(previous.status==='warranty'&&(!['warranty','closed'].includes(input.status)||['manufacturer_id','product_kind','product_code','boxes','ownership'].some(key=>input[key]!==previous[key])))throw Error('Preserve identificação e quantidade vinculadas à garantia.')
  const key=`liber:offline-customer-returns:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira pedidos existentes.');if(rows.some(row=>row.returnId===previous.id))throw Error('Já existe pedido pendente desta devolução; confira antes de alterar novamente.')
  const draft={id:crypto.randomUUID(),userId,returnId:previous.id,previous,expectedUpdatedAt:previous.updated_at,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.');message.textContent=`Alteração guardada: ${draft.id}. Nenhum andamento ou saldo foi alterado no servidor.`
 }catch(error){message.textContent=error.message||'Falha ao guardar alteração.'}
})
refreshReturnEditSources()

function refreshSuppliers(){const select=document.getElementById('receipt-supplier'),selected=select.value;select.replaceChildren();for(const row of [{id:'',name:'Não informado'},...suppliers]){const option=document.createElement('option');option.value=row.id;option.textContent=row.name;select.append(option)}if([...select.options].some(option=>option.value===selected))select.value=selected}
document.getElementById('draft-reason').addEventListener('change',refreshDraftSources)
refreshSuppliers()

function refreshTestSources(){const select=document.getElementById('test-source'),selected=select.value;select.replaceChildren();stock.forEach((row,index)=>{if(row.status!=='Aguardando testagem'||/^(MGM|MFI|MRE|MFR)-/.test(row.code)||row.boxes<1)return;const option=document.createElement('option');option.value=String(index);option.textContent=`${row.code} · ${row.location} · ${row.boxes} caixas aguardando teste`;select.append(option)});if([...select.options].some(option=>option.value===selected))select.value=selected;document.getElementById('test-draft').disabled=!select.options.length}
document.getElementById('test-draft').addEventListener('click',()=>{
 const message=document.getElementById('test-state')
 try{
  check();const userId=localStorage.getItem(prefix+'account'),row=stock[Number(document.getElementById('test-source').value)],boxes=Number(document.getElementById('test-boxes').value)
  if(!userId||!row||row.status!=='Aguardando testagem'||/^(MGM|MFI|MRE|MFR)-/.test(row.code)||!Number.isSafeInteger(boxes)||boxes<1||boxes>row.boxes)throw Error('Confira amortecedor aguardando teste e quantidade inteira dentro da consulta.')
  const key=`liber:offline-tests:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]'),input={row:{...row},boxes};if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira pedidos existentes.');if(rows.some(item=>item.input?.row?.code===row.code&&item.input?.row?.location===row.location&&item.input?.boxes===boxes)){message.textContent='Já existe uma aprovação igual pendente neste aparelho.';return}
  const draft={id:crypto.randomUUID(),userId,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.');message.textContent=`Testagem guardada para conferência: ${draft.id}. Nenhuma caixa foi liberada para venda.`
 }catch(error){message.textContent=error.message||'Falha ao guardar aprovação.'}
})
refreshTestSources()

function refreshNewProductLocations(){const select=document.getElementById('new-product-location'),selected=select.value;select.replaceChildren();locations.forEach(code=>{const option=document.createElement('option');option.value=code;option.textContent=code;select.append(option)});if([...select.options].some(option=>option.value===selected))select.value=selected;document.getElementById('new-product-draft').disabled=!select.options.length}
document.getElementById('new-product-draft').addEventListener('click',()=>{const message=document.getElementById('new-product-state');try{check();const userId=localStorage.getItem(prefix+'account'),code=document.getElementById('new-product-code').value.trim().toUpperCase(),application=document.getElementById('new-product-application').value.trim(),location=document.getElementById('new-product-location').value,boxes=Number(document.getElementById('new-product-boxes').value);if(!userId||!/^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(code)||!application||application.length>300||!locations.includes(location)||!Number.isSafeInteger(boxes)||boxes<1||boxes>2147483647)throw Error('Confira código, aplicação, local e quantidade.');if(stock.some(row=>row.code===code))throw Error('Código presente na consulta; utilize entrada de produto existente.');const input={code,application,location,boxes,status:/^(MGM|MFI|MRE|MFR)-/.test(code)?'in_stock':'awaiting_test',supplierId:'',lot:''},key=`liber:offline-receipts:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows)||rows.length>=100||rows.some(row=>row.input?.code===code))throw Error('Já existe pedido para este código ou a fila precisa de revisão.');const draft={id:crypto.randomUUID(),userId,input,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.');message.textContent=`Produto guardado para envio com entrada: ${draft.id}. Nenhum cadastro ou saldo foi alterado no servidor.`}catch(error){message.textContent=error.message||'Falha ao guardar produto.'}})
document.getElementById('registration-draft').addEventListener('click',()=>{const message=document.getElementById('registration-state');try{check();const userId=localStorage.getItem(prefix+'account'),kind=document.getElementById('registration-kind').value,name=document.getElementById('registration-name').value.trim().replace(/\s+/g,' ');if(!userId||!['supplier','manufacturer'].includes(kind)||!name||name.length>100)throw Error('Confira tipo e nome do cadastro.');const key=`liber:offline-registrations:v1:${userId}`,rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows)||rows.length>=100)throw Error('Confira os pedidos existentes.');if(rows.some(row=>row.kind===kind&&row.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))throw Error('Já existe cadastro igual pendente neste aparelho.');const draft={id:crypto.randomUUID(),userId,kind,name,phase:'draft'};rows.push(draft);const value=JSON.stringify(rows);localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Gravação não confirmada.');message.textContent=`Cadastro guardado: ${draft.id}. Envie e confira conectado antes de usar em operações.`}catch(error){message.textContent=error.message||'Falha ao guardar cadastro.'}})
refreshNewProductLocations()
