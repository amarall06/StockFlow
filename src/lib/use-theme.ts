import{useEffect,useState}from'react'
export function useTheme(){
 const[preference,setPreference]=useState<'light'|'dark'|null>(()=>{try{const saved=localStorage.getItem('liber-automotive-theme');return saved==='light'||saved==='dark'?saved:null}catch{return null}})
 const[systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches)
 useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)'),change=()=>setSystemDark(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[])
 useEffect(()=>{if(preference===null)return;try{localStorage.setItem('liber-automotive-theme',preference)}catch{/* A escolha continua funcionando nesta sessão. */}},[preference])
 const dark=preference===null?systemDark:preference==='dark'
 return{dark,toggle:()=>setPreference(dark?'light':'dark')}
}
