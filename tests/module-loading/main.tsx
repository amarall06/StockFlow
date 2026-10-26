/* oxlint-disable react/only-export-components -- entrada isolada do laboratório, fora do produto. */
import {lazy,Suspense,useState,type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import {ModuleBoundary,ModuleLoading} from '../../src/components/ModuleBoundary'
import '../../src/index.css'

let complete:()=>void
const Slow=lazy(()=>new Promise<{default:()=>ReactNode}>(resolve=>{
  complete=()=>resolve({default:()=> <h2>Tela carregada sem movimentar estoque</h2>})
}))
const Broken=lazy(()=>Promise.reject(new Error('Falha simulada no módulo, sem rede ou banco')))
function Lab(){
  const [page,setPage]=useState('home')
  return <main style={{maxWidth:800,margin:'40px auto',padding:24}}>
    <h1>Laboratório de carregamento</h1><p>Componentes reais de espera e tratamento de erro, sem Supabase, sessão ou estoque.</p>
    <nav aria-label="Telas de teste"><button onClick={()=>setPage('home')}>Página inicial</button> <button onClick={()=>setPage('slow')}>Abrir tela lenta</button> <button onClick={()=>complete?.()}>Concluir carregamento</button> <button onClick={()=>setPage('broken')}>Simular falha</button></nav>
    <ModuleBoundary key={page}><Suspense fallback={<ModuleLoading/>}>{page==='slow'?<Slow/>:page==='broken'?<Broken/>:<h2>Página inicial disponível</h2>}</Suspense></ModuleBoundary>
  </main>
}
createRoot(document.getElementById('root')!).render(<Lab/> )
