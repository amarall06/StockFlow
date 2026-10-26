import {createContext,useCallback,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react'
import {isSpringCode} from '../lib/product-category'
import {loadProductPhotos,preparePhoto,saveProductPhoto,type SavedPhoto} from '../lib/product-photos'
import './ProductPhotos.css'

type PhotoContext={photos:Record<string,SavedPhoto>;canEdit:boolean;ready:boolean;error:string;refresh:(force?:boolean)=>Promise<void>}
const Photos=createContext<PhotoContext>({photos:{},canEdit:false,ready:false,error:'',refresh:async()=>{}})

// Uma consulta compartilhada atende todas as miniaturas, inclusive códigos repetidos em prateleiras.
export function ProductPhotosProvider({children,canEdit}:{children:ReactNode;canEdit:boolean}){
  const [photos,setPhotos]=useState<Record<string,SavedPhoto>>({})
  const [ready,setReady]=useState(false)
  const [error,setError]=useState('')
  const pending=useRef<Promise<void>|null>(null)
  const refresh=useCallback(function refreshPhotos(force=false):Promise<void>{
    if(pending.current)return force?pending.current.catch(()=>{}).then(()=>refreshPhotos(true)):pending.current
    const request=loadProductPhotos().then((result)=>{setPhotos(result);setReady(true);setError('')})
      .catch(()=>{setReady(false);setError('Não foi possível consultar as fotos salvas. Os exemplos não identificam peças reais.');throw new Error('Não foi possível atualizar as fotos.')})
      .finally(()=>{pending.current=null})
    pending.current=request
    return request
  },[])
  useEffect(()=>{
    const update=()=>{void refresh().catch(()=>{})}
    update()
    // URLs privadas duram cinco minutos; renova antes do vencimento e ao voltar à janela.
    const timer=window.setInterval(update,240000)
    window.addEventListener('focus',update)
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',update)}
  },[refresh])
  return <Photos.Provider value={{photos,canEdit,ready,error,refresh}}>{children}</Photos.Provider>
}

function PhotoDialog({code,onClose}:{code:string;onClose:()=>void}){
  const {photos,canEdit,ready,error:storageError,refresh}=useContext(Photos)
  const photo=photos[code]
  const dialog=useRef<HTMLDialogElement>(null)
  const titleId=useId()
  const fileId=useId()
  const [draft,setDraft]=useState<{photo:Blob;url:string;name:string}|null>(null)
  const prepared=draft?.photo??null
  const preview=draft?.url??''
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [failedImage,setFailedImage]=useState(false)
  const source=preview||photo?.url||examplePhoto(code)
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>{element?.close()}},[])
  useEffect(()=>()=>{if(draft)URL.revokeObjectURL(draft.url)},[draft])
  async function selectFile(file?:File){
    if(!file||busy)return
    setBusy(true);setError('');setMessage('');setFailedImage(false);setDraft(null)
    try{const photo=await preparePhoto(file);setDraft({photo,url:URL.createObjectURL(photo),name:file.name})}
    catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível preparar a foto.')}
    finally{setBusy(false)}
  }
  async function save(){
    if(!prepared||!canEdit||!ready||busy)return
    setBusy(true);setError('');setMessage('')
    try{
      await saveProductPhoto(code,prepared)
      // O envio e a consulta são etapas distintas: não esconder uma foto salva se a consulta falhar.
      try{await refresh(true);setDraft(null);setMessage('Foto salva para este produto.')}
      catch{setMessage('Foto enviada. Atualize a página para confirmar a visualização.');setDraft(null)}
    }catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível salvar a foto.')}
    finally{setBusy(false)}
  }
  return <dialog ref={dialog} className="product-photo-dialog" aria-labelledby={titleId} onCancel={(event)=>{event.preventDefault();if(!busy)onClose()}}>
    <div className="photo-dialog-heading"><div><p>{isSpringCode(code)?'MOLA':'AMORTECEDOR'}</p><h2 id={titleId}>{code}</h2></div><button type="button" className="theme-toggle" onClick={onClose} disabled={busy}>Fechar</button></div>
    <div className="photo-large">{failedImage?<p>Foto indisponível. Feche e tente novamente.</p>:<img key={source} src={source} alt={preview?`Prévia da nova foto de ${code}`:photo?`Foto cadastrada de ${code}`:`Exemplo ilustrativo de ${isSpringCode(code)?'mola':'amortecedor'}`} onError={()=>setFailedImage(true)}/>}</div>
    <p className={`photo-caption${!photo&&!preview?' photo-example-caption':''}`}>{preview?`Prévia · ${draft?.name} · ainda não salva`:photo?'Foto cadastrada para este código':'Imagem ilustrativa · não corresponde necessariamente a este código'}</p>
    {canEdit&&<section className="photo-edit"><h3>{photo?'Substituir foto':'Adicionar foto do produto'}</h3><p>JPG, PNG ou WebP de até 8 MB. Confira a peça antes de salvar.</p>
      <label className="photo-file-label" htmlFor={fileId}>Escolher imagem</label><input id={fileId} className="photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!ready} onChange={(event)=>{const file=event.target.files?.[0];event.target.value='';void selectFile(file)}}/>
      <button type="button" className="add-product-button" disabled={busy||!prepared||!ready} onClick={()=>void save()}>{busy?'Preparando / salvando…':'Salvar foto'}</button>
      {!ready&&<p role="status">O envio de fotos está indisponível no momento.</p>}
    </section>}
    {storageError&&<p className="photo-message" role="status">{storageError}</p>}{message&&<p className="photo-message" role="status">{message}</p>}{error&&<p className="auth-error" role="alert">{error}</p>}
  </dialog>
}

// A lista baixa só 1–2 KB por exemplo; a versão maior é pedida ao abrir o diálogo.
function examplePhoto(code:string,thumbnail=false){return `/images/${isSpringCode(code)?'spring':'shock'}-example${thumbnail?'-thumb':''}.webp`}

// O botão real permite abrir a ampliação por clique, Enter ou Espaço.
export function ProductPhoto({code}:{code:string}){
  const {photos}=useContext(Photos)
  const [open,setOpen]=useState(false)
  const [failedSource,setFailedSource]=useState('')
  const photo=photos[code]
  const source=photo?.url||examplePhoto(code,true)
  return <><button className="product-photo-thumb" type="button" aria-label={`Ampliar foto de ${code}${photo?'':' — exemplo ilustrativo'}`} onClick={()=>setOpen(true)} title={photo?'Ampliar foto':'Imagem ilustrativa · clique para ampliar'}>
    {failedSource===source?<span aria-hidden="true">Foto</span>:<img src={source} alt="" width="48" height="48" loading="lazy" decoding="async" onError={()=>setFailedSource(source)}/>}
    {!photo&&<span className="photo-example-badge">Exemplo</span>}
  </button>{open&&<PhotoDialog code={code} onClose={()=>setOpen(false)}/>}</>
}
