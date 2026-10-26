// Inicie com node scripts/serve-outflow-lab.mjs. Encerrar apaga os dados em memória.
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createOutflowLab } from '../tests/outflow-lab/server.mjs'

const root = fileURLToPath(new URL('../',import.meta.url))
const client = fileURLToPath(new URL('../tests/outflow-lab/client.ts',import.meta.url))
const lab = createOutflowLab()
const server = await createServer({
  root, configFile:false, envDir:false, envPrefix:'LAB_UNUSED_', publicDir:false,
  cacheDir:'node_modules/.vite-outflow-lab',
  optimizeDeps:{entries:['tests/outflow-lab/index.html']},
  server:{host:'127.0.0.1',port:5180,strictPort:true,open:false},
  plugins:[{
    name:'isolated-outflow-lab',enforce:'pre',
    resolveId(source,importer) {
      if(source==='./supabase' && importer?.replaceAll('\\','/').endsWith('/src/lib/outflow-api.ts')) return client
      // Bloqueio adicional: nunca carregar o cliente Supabase real neste servidor.
      if(source.replaceAll('\\','/').match(/(^|\/)supabase(\.ts)?$/)) throw new Error('Cliente real bloqueado no laboratório.')
    },
    configureServer(vite) {
      vite.middlewares.use((req,res,next)=>{
        // Impede conexões externas, inclusive se um import real escapar da substituição.
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:5180; img-src 'self' data:; object-src 'none'; frame-src 'none'")
        if(req.url==='/'){res.writeHead(302,{Location:'/tests/outflow-lab/index.html'});res.end();return}
        void lab.middleware(req,res,next)
      })
    },
  },react()],
})
await server.listen()
console.log('Laboratório isolado: http://127.0.0.1:5180/tests/outflow-lab/index.html')
console.log('Sem .env, login, Supabase ou saldos reais. Dados apagados ao encerrar.')
for(const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await server.close();process.exit(0)})
