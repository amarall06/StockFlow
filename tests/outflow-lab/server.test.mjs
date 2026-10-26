// Verifica o isolamento e a falha HTTP real do servidor descartável.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { createOutflowLab } from './server.mjs'

test('laboratório corta a resposta após aceite e não duplica o pedido',async()=>{
  const lab=createOutflowLab()
  const server=createServer((req,res)=>void lab.middleware(req,res,()=>{res.writeHead(404);res.end()}))
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const origin=`http://127.0.0.1:${server.address().port}`
  const post=(path,value,requestOrigin=origin)=>fetch(origin+path,{
    method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify(value),
  })
  try{
    assert.equal((await post('/__outflow_lab/reset',{},'http://outro-site.invalid')).status,403)
    for(const code of ['AGM-35','MGM-35']){
      const payload={p_code:code,p_location:'LAB',p_status:code==='MGM-35'?'in_stock':'released_for_sale',p_boxes:1,p_reason:'sale',p_notes:null,p_reference:null,p_request_id:randomUUID()}
      const body={functionName:'register_stock_outflow',payload}
      await assert.rejects(post('/__outflow_lab/rpc',body),/fetch failed/)
      assert.equal(lab.state().balances[code],1)
      await assert.rejects(post('/__outflow_lab/rpc',body),/fetch failed/)
      await post('/__outflow_lab/resume',{code})
      const retry=await (await post('/__outflow_lab/rpc',body)).json()
      assert(retry.data.id)
      assert.equal(lab.state().balances[code],1)
      assert.equal(lab.state().events.filter(event=>event.code===code).length,1)
      const changed=await post('/__outflow_lab/rpc',{...body,payload:{...payload,p_boxes:2}})
      assert.equal((await changed.json()).error.code,'22023')
    }
    assert.equal(lab.state().events.length,2)
    const separate=createOutflowLab()
    assert.equal(separate.state().events.length,0)
    assert.deepEqual(separate.state().balances,{'AGM-35':2,'MGM-35':2})
  }finally{
    server.closeAllConnections()
    await new Promise(resolve=>server.close(resolve))
  }
})
