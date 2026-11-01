import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
const root=fileURLToPath(new URL('../',import.meta.url))
const purpose={
 App:'Controla sessão, login, conta inativa e falhas de autenticação; só abre a operação após conferir o perfil.',
 InventoryApp:'Organiza navegação, conta, consultas e módulos operacionais. A distinção entre demonstração e banco evita aparentar uma gravação online que só aconteceu no navegador.',
 AuthScreen:'Estrutura a tela de acesso e a marca reutilizada durante conexão e falhas.',
 ThemeToggle:'Alterna a preferência visual clara/escura; não modifica acesso ou estoque.',
 InventoryDashboard:'Combina totais atuais e relatórios; blocos são botões e o detalhamento pode ser recolhido no celular.',
 InventoryActivity:'Consulta e desenha a série diária real; período, série, controle de dia e tabela permitem conferir os valores.',
 InventoryNavigation:'Centraliza consultas de estoque geral, catálogo e alertas, usando os mesmos saldos consultados.',
 InventoryTurnover:'Calcula e apresenta giro/ABC por volume de vendas, com filtros e exportação.',
 StockTransfers:'Grava um pedido antes de transferir, impede duplicação e recupera confirmação após falhas.',
 StockOutflows:'Registra saídas com motivo e pedido recuperável, sem retirar duas vezes após resposta perdida.',
 ReceiptForm:'Reúne validação e envio de recebimentos, fornecedor e lote, conforme o cargo.',
 ShockTesting:'Aprova caixas de amortecedores e consulta o histórico; molas ficam fora dessa regra.',
 StockAlerts:'Compara estoque normal com mínimos e permite configuração quando o cargo autoriza.',
 WarrantyManufacturers:'Consulta e administra fabricantes da garantia, saldos e exportação.',
 WarrantyBoxesDialog:'Controla entrada e retirada de caixas da garantia em um diálogo.',
 WarrantyReturns:'Controla recebimento, estados e encerramento de devoluções com garantias e seus eventos.',
 ProductCatalog:'Edita aplicações e tipos dos produtos com controle de concorrência.',
 ProductApplications:'Formata aplicações e anos de veículos para os componentes de consulta.',
 ProductPhotos:'Compartilha fotos privadas, renova URLs, prepara upload e abre a ampliação.',
 ApplicationHistory:'Exibe antes/depois e autoria das alterações do cadastro de aplicações.',
 MovementHistory:'Consulta movimentos em páginas, filtra produto/categoria/tipo e resolve nomes autorizados.',
 ProfileSettings:'Atualiza o próprio nome pelo servidor, sem editar cargos ou outras contas.',
 ModuleBoundary:'Oferece espera e recuperação quando o carregamento de um módulo falha.',
 NavigationIcon:'Reúne os ícones dos módulos; ícones não executam operações por conta própria.',
 EditButton:'Padroniza o botão acessível de edição.',
 ExportCsvButton:'Prepara CSV dos dados já consultados e mostra resultado ou falha do download.',
 'activity-api':'Busca e valida dias, quantidades e continuidade da série antes de desenhar o gráfico.',
 'dashboard-api':'Define e valida o contrato do relatório de vendas/recebimentos.',
 'dashboard-summary':'Calcula totais do estoque normal e alertas por categoria, sem somar garantia.',
 'inventory-api':'Traduz entre tabelas/RPCs do banco e os modelos usados pela interface; pagina cadastros e saldos.',
 'read-all-rows':'Carrega páginas em ordem e rejeita resultados parciais quando alguma página falha.',
 'transfer-api':'Valida/normaliza a transferência e envia UUID para a função idempotente.',
 'pending-transfer':'Guarda, valida e encerra o pedido de transferência na mesma aba e conta.',
 'outflow-api':'Valida motivos e situações de saída; distingue recusa explícita de confirmação desconhecida.',
 'pending-outflow':'Recupera o pedido de saída por conta e aba; dados corrompidos bloqueiam novo envio.',
 'receipt-api':'Normaliza fornecedor/lote/caixas e chama a RPC de recebimento com identificação do pedido.',
 'profile-api':'Atualiza somente o nome da conta identificada pela sessão do servidor.',
 'stock-minimum-api':'Valida e envia o mínimo de caixas com verificação da versão esperada do cadastro.',
 'stock-alerts':'Regras puras de mínimo, estoque zero, categorias e soma de localizações.',
 'shock-testing':'Contratos, validações e consultas da aprovação de amortecedores.',
 'turnover-api':'Consulta o período de giro e confere se a resposta corresponde ao filtro solicitado.',
 turnover:'Valida o relatório e calcula participação, acumulado e classes ABC, tratando empates.',
 'warranty-api':'Comunicação com fabricantes e movimentações de caixas em garantia.',
 'warranty-returns':'Contratos e validações do fluxo de devoluções e seu histórico.',
 'product-photos':'Valida conteúdo de imagem, reduz pixels e faz upload/consulta privada.',
 'product-category':'Regra compartilhada para reconhecer prefixos de molas.',
 'product-details':'Tipos e formatação de aplicações, busca e tipo de amortecedor.',
 'application-history':'Tipos e apresentação das diferenças do histórico de aplicações.',
 csv:'Gera planilhas com acentos, separadores e proteção contra fórmulas em textos; limpa URLs temporárias.',
 supabase:'Inicializa o cliente com URL/chave publicável; não contém chave administrativa.',
 main:'Ponto de entrada do React: conecta App ao elemento root do HTML.'
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const files=[]
function walk(path){for(const name of readdirSync(path).sort()){const full=join(path,name);if(statSync(full).isDirectory())walk(full);else if(/\.(tsx?|css|sql|mjs|ps1|svg|html)$/.test(name))files.push(full)}}
for(const dir of ['src','supabase','scripts','tests'])walk(join(root,dir))
for(const name of ['index.html','package.json','vite.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vercel.json','.gitignore','.env.example','.github/workflows/verify.yml'])files.push(join(root,name))
const sections=files.map((path,index)=>{
 const name=relative(root,path),code=readFileSync(path,'utf8'),base=name.split('/').at(-1).replace(/\.[^.]+$/,'')
 let why=purpose[base]
 if(name.endsWith('.css'))why=`Define aparência, organização e adaptação de ${base}. CSS não concede permissão e não grava dados; a lógica está nos TSX e no servidor.`
 if(name.includes('/migrations/'))why='Mudança versionada do banco. Aplicar na ordem e uma única vez. As instruções SQL abaixo criam/alteram tabelas, funções, índices e permissões; os comentários explicam as decisões específicas.'
 if(name.includes('/tests/')||name.startsWith('tests/'))why='Ensaio isolado: cria dados/respostas de teste para verificar comportamentos. Não deve ser usado como uma migração do banco de produção.'
 if(name.startsWith('scripts/check-'))why='Regressão automatizada: importa o código real ou uma transpilação e usa assert para recusar resultados inesperados. Onde há mocks, a verificação não comprova a rede/serviço hospedado.'
 why??='Arquivo de infraestrutura ou ferramenta de apoio. Leia os comentários e consulte a aula sobre pastas para entender onde ele participa do build, dos testes ou da publicação.'
 const symbols=[...code.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|create\s+(?:or\s+replace\s+)?function\s+([\w.]+)/gi)].map(m=>m[1]??m[2])
 return `<details id="file-${index}" class="file"><summary>${escape(name)}</summary><p>${escape(why)}</p>${symbols.length?`<p><strong>Funções para localizar:</strong> ${escape([...new Set(symbols)].join(', '))}.</p>`:''}<p>${code.split('\n').length} linhas · SHA-256 ${createHash('sha256').update(code).digest('hex').slice(0,16)}</p><pre><code>${escape(code)}</code></pre></details>`
}).join('\n')
const lesson=readFileSync(join(root,'docs/tutorial-iniciante.md'),'utf8')
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIBER — Livro do código explicado</title><style>body{margin:0;background:#f7f4ed;color:#302e2a;font:16px/1.65 system-ui}main{max-width:1100px;margin:auto;padding:24px}h1{line-height:1.25}input,button{font:inherit;padding:12px;border:1px solid #88796a;border-radius:7px}input{width:min(100%,620px)}details{background:white;border:1px solid #d0c4b4;margin:12px 0;border-radius:8px;padding:16px}summary{cursor:pointer;font-weight:650;overflow-wrap:anywhere}pre{white-space:pre;overflow:auto;background:#20262b;color:#f1e8d8;padding:18px;border-radius:7px;font-size:13px;tab-size:2}.lesson{white-space:pre-wrap;background:white;color:#302e2a;font:16px/1.7 system-ui}a{color:#77502f}:focus-visible{outline:3px solid #a65c2d;outline-offset:3px}[hidden]{display:none}</style><main><h1>LIBER automotive: seu livro do código</h1><p>Abra este arquivo no navegador. Funciona offline, sem login, sem enviar dados. As aulas ensinam os conceitos; cada arquivo abaixo traz seu papel, funções e o código completo desta edição. Nunca contém .env.local ou credenciais de produção.</p><details open><summary>Comece aqui: aulas para iniciantes</summary><pre class="lesson">${escape(lesson)}</pre></details><label for="search">Procurar arquivo, função ou palavra do código</label><p><input id="search" type="search" placeholder="Ex.: StockTransfers, RLS, onClick…"></p><button id="expand">Abrir arquivos encontrados</button> <button id="collapse">Recolher arquivos</button><p id="count" role="status">${files.length} arquivos</p>${sections}</main><script>const files=[...document.querySelectorAll('.file')],search=document.querySelector('#search');search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase('pt-BR');let n=0;for(const file of files){file.hidden=!file.textContent.toLocaleLowerCase('pt-BR').includes(q);if(!file.hidden)n++}document.querySelector('#count').textContent=n+' arquivos encontrados'});document.querySelector('#expand').onclick=()=>files.filter(f=>!f.hidden).forEach(f=>f.open=true);document.querySelector('#collapse').onclick=()=>files.forEach(f=>f.open=false);</script></html>`
writeFileSync(join(root,'docs/livro-do-codigo.html'),html)
console.log(`Livro gerado: ${files.length} arquivos completos, sem arquivos de ambiente privados.`)
