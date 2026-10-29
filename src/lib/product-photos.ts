import {supabase} from './supabase'

export const PHOTO_BUCKET='product-photos'
export const MAX_SOURCE_BYTES=8*1024*1024
export const MAX_PHOTO_BYTES=2*1024*1024
export type SavedPhoto={url:string;updatedAt:string}

export function photoObjectName(code:string){
  if(!/^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$/.test(code))throw new Error('Código de produto inválido.')
  return `${code}.webp`
}

// A extensão não é suficiente: confere também os primeiros bytes do arquivo.
export async function validatePhoto(file:File){
  if(!file.size||file.size>MAX_SOURCE_BYTES)throw new Error('Escolha uma imagem de até 8 MB.')
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer())
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255
  const png=[137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte)
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'
  if(!(jpeg&&file.type==='image/jpeg')&&!(png&&file.type==='image/png')&&!(webp&&file.type==='image/webp'))throw new Error('Use uma foto JPG, PNG ou WebP válida.')
}

// Reduz a imagem e regrava somente os pixels, sem manter os metadados do arquivo original.
export async function preparePhoto(file:File):Promise<Blob>{
  await validatePhoto(file)
  const bitmap=await createImageBitmap(file)
  try{
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000)throw new Error('A resolução da imagem é muito grande. Escolha uma foto menor.')
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
    const context=canvas.getContext('2d')
    if(!context)throw new Error('Não foi possível preparar a foto neste navegador.')
    context.drawImage(bitmap,0,0,canvas.width,canvas.height)
    for(const quality of [.85,.7,.55]){
      const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,'image/webp',quality))
      if(!blob||blob.type!=='image/webp')throw new Error('Este navegador não conseguiu preparar a foto. Tente um navegador atualizado.')
      if(blob.size<=MAX_PHOTO_BYTES)return blob
    }
    throw new Error('A imagem ainda está muito grande. Escolha uma foto menor.')
  }finally{bitmap.close()}
}

export async function loadProductPhotos():Promise<Record<string,SavedPhoto>>{
  if(!supabase)throw new Error('O serviço de fotos está indisponível.')
  const bucket=supabase.storage.from(PHOTO_BUCKET)
  const files:Array<{name:string;updated_at:string}>=[]
  // Paginação evita esconder imagens quando o catálogo passar de cem produtos.
  for(let offset=0;;offset+=100){
    const {data,error}=await bucket.list('',{limit:100,offset,sortBy:{column:'name',order:'asc'}})
    if(error)throw error
    for(const file of data??[])if(file.name.endsWith('.webp'))files.push({name:file.name,updated_at:file.updated_at??''})
    if((data?.length??0)<100)break
  }
  const photos:Record<string,SavedPhoto>={}
  for(let offset=0;offset<files.length;offset+=100){
    const batch=files.slice(offset,offset+100)
    const {data,error}=await bucket.createSignedUrls(batch.map((file)=>file.name),300)
    if(error)throw error
    for(const photo of data??[]){
      if(photo.error||!photo.path||!photo.signedUrl)throw new Error('Não foi possível consultar as fotos salvas.')
      photos[photo.path.replace(/\.webp$/,'')]={url:`${photo.signedUrl}&v=${encodeURIComponent(batch.find((file)=>file.name===photo.path)?.updated_at??'')}`,updatedAt:batch.find((file)=>file.name===photo.path)?.updated_at??''}
    }
  }
  return photos
}

export async function saveProductPhoto(code:string,photo:Blob){
  if(!supabase)throw new Error('O serviço de fotos está indisponível.')
  if(photo.type!=='image/webp'||!photo.size||photo.size>MAX_PHOTO_BYTES)throw new Error('A foto preparada não é válida.')
  const {error}=await supabase.storage.from(PHOTO_BUCKET).upload(photoObjectName(code),photo,{contentType:'image/webp',cacheControl:'0',upsert:true})
  if(error)throw new Error('Não foi possível salvar a foto. Confira sua conexão e a permissão de Administrador.')
}
