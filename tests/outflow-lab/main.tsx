import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { StockOutflows } from '../../src/components/StockOutflows'
import type { StockRow } from '../../src/lib/inventory-api'
import './style.css'

type LabState = { balances: Record<string,number>; events: {id:string;code:string;requestId:string}[]; attempts: {requestId:string;code:string;repeated:boolean;responseLost?:boolean}[] }
function Lab() {
  const [state,setState] = useState<LabState|null>(null)
  const [stock,setStock] = useState<StockRow[]>([])
  const [error,setError] = useState('')
  async function resume(code:string) {
    try {
      const response=await fetch('/__outflow_lab/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})})
      if(!response.ok) throw new Error('Falha ao restabelecer respostas.')
    } catch {setError('Não foi possível restabelecer as respostas locais.')}
  }
  async function read(updateStock = false) {
    try {
      const response = await fetch('/__outflow_lab/state',{cache:'no-store'})
      if (!response.ok) throw new Error('Falha na consulta local.')
      const next:LabState = await response.json()
      setState(next);setError('')
      if(updateStock) setStock(Object.entries(next.balances).filter(([,boxes])=>boxes>0).map(([code,boxes])=>({
        code,location:'LAB',status:code==='MGM-35'?'Em estoque':'Liberado para venda',boxes,
      })) as StockRow[])
    } catch { setError('Não foi possível consultar o servidor local do laboratório.') }
  }
  useEffect(()=>{
    void read(true)
    // A observação não atualiza o saldo do formulário durante uma confirmação incerta.
    const timer=setInterval(()=>void read(),800)
    return ()=>clearInterval(timer)
  },[])
  return <main>
    <header><p>LABORATÓRIO LOCAL · SEM SUPABASE</p><h1>Perda de confirmação</h1>
      <p>Dados fictícios em memória. A retirada será aceita pelo servidor local, mas suas respostas serão interrompidas até clicar em Restabelecer respostas. Depois reenvie sem mudar os campos.</p>
      <p>O perfil de Administrador aqui é simulado. Este ambiente não testa login ou permissões reais.</p></header>
    {error&&<p role="alert">{error}</p>}
    {state&&<aside aria-label="Estado no servidor de teste"><h2>Servidor local</h2>
      <p>Amortecedores: <strong>{state.balances['AGM-35']}</strong> caixas · Molas: <strong>{state.balances['MGM-35']}</strong> caixas · Retiradas registradas: <strong>{state.events.length}</strong></p>
      <button onClick={()=>void resume('AGM-35')}>Restabelecer respostas de amortecedores</button>{' '}
      <button onClick={()=>void resume('MGM-35')}>Restabelecer respostas de molas</button>
      <ol>{state.attempts.map((attempt,index)=><li key={index}>{attempt.code} · ID {attempt.requestId} · {attempt.responseLost?'Retirada aceita; confirmação cortada':attempt.repeated?'Reenvio: mesmo evento, sem nova retirada':'Resposta entregue'}</li>)}</ol>
    </aside>}
    <StockOutflows stock={stock} catalog={{}} ready={Boolean(state)} isAdministrator={true} onRefresh={()=>read(true)}/>
  </main>
}
createRoot(document.getElementById('root')!).render(<Lab/> )
