# Fotos de produtos — estudo e operação

## Como usar

Na lista Produtos, no estoque de amortecedores/molas, na consulta conjunta ou no resultado da leitura do código, clique na miniatura para ampliar. Quem tem função Administrador pode escolher JPG, PNG ou WebP de até 8 MB, conferir a prévia e clicar em Salvar foto. A imagem é vinculada ao código e reaparece em todas as localizações desse produto. A aba Aplicações continua exclusiva dos amortecedores.

Uma foto cadastrada por produto substitui a foto anterior. Esta primeira versão não mantém histórico das versões da imagem nem oferece exclusão. Duas alterações simultâneas de administradores usam a última gravação concluída; revisar a foto antes de usar o catálogo para identificar uma peça.

## Exemplos e imagens reais

As duas imagens de exemplo são ilustrações geradas, sem marca ou aplicação veicular específica. São reutilizadas por categoria e marcadas como Exemplo na miniatura e Imagem ilustrativa na ampliação. Elas não servem para identificar fisicamente uma peça. Quando houver uma foto real, o administrador poderá substituí-las pelo upload.

Arquivos públicos de exemplo: `public/images/shock-example.png` e `public/images/spring-example.png`. Foram gerados pela ferramenta integrada image_gen, sem API/CLI externo. Originais preservados em CODEX_HOME/generated_images e cópias mantidas no projeto.

Prompts finais utilizados:

1. Use case: product-mockup. Create one square professional catalog photograph of a generic unbranded automotive shock absorber, black painted cylindrical steel body, polished silver piston rod and mounting eyes, lying diagonally, entire object visible with generous margins on an ivory studio background. Soft natural studio light, realistic materials, restrained technical catalog photography for an inventory application. No vehicle, no people, no logo, no lettering, no part code, no watermark. This is an illustrative generic example, not an identification of any specific vehicle part.
2. Use case: product-mockup. Create one square professional catalog photograph of a single generic unbranded automotive coil suspension spring, black painted steel, standing upright, full object visible with generous margins on an ivory studio background. Soft natural studio light, realistic materials, restrained technical catalog photography for an inventory application. No shock absorber, no car, no people, no logo, no lettering, no part code, no watermark. This is an illustrative generic example, not an identification of any specific vehicle part.

## Código explicado

```tsx
// useState guarda se a janela de ampliação está aberta.
const [open, setOpen] = useState(false)
// onClick recebe uma função, executada ao ativar o botão por mouse ou teclado.
<button type="button" onClick={() => setOpen(true)}>Ampliar foto</button>
// O JSX só coloca a janela na tela enquanto open for true.
{open && <PhotoDialog code={code} onClose={() => setOpen(false)} />}
```

`ProductPhotosProvider` usa contexto React para compartilhar a consulta entre miniaturas. Isso evita buscar repetidamente a mesma foto quando um código ocupa várias prateleiras. `useEffect` renova links privados antes do vencimento e libera os recursos da prévia quando ela é descartada. `useRef` guarda a referência da janela dialog e controla consultas em andamento sem criar outro estado visual.

`validatePhoto` confere tamanho, MIME e assinatura inicial do arquivo. `preparePhoto` decodifica a imagem, limita resolução e converte os pixels em WebP; arquivos inválidos não são enviados. A saída tem até 2 MB. Esse processamento não permite SVG ou HTML e não conserva os metadados originais do arquivo.

`saveProductPhoto` usa o código no nome do objeto, por exemplo AGM-35.webp, com upsert para substituição. `loadProductPhotos` pagina os objetos e solicita links assinados de cinco minutos; a interface renova a consulta em quatro minutos. As fotos reais ficam em um bucket privado, não dentro do GitHub.

## Regras no Supabase

Migração `202610250007_product_photos.sql` aplicada pela interface com autorização do usuário em 25/10/2026, retorno Success. No rows returned. Bucket product-photos privado, limite 2 MB, MIME image/webp. Contas ativas consultam; somente Administrador insere/substitui e apenas nomes correspondentes a produtos existentes. Sem nova permissão de exclusão. Não altera saldos, cargos, contas nem a API de operações de estoque, que continua versão 13.

Referências: https://supabase.com/docs/guides/storage/buckets/fundamentals e https://supabase.com/docs/guides/storage/security/access-control.

## Verificação e limites

Testes locais: códigos inválidos, formatos/tamanho, paginação com mais de cem imagens, falhas de acesso, nomes de upload, exemplos por categoria e botões acessíveis. Compilação aprovada. Na interface conectada: miniaturas e ampliação dos dois exemplos; seleção de PNG, decodificação, prévia e habilitação de Salvar; Escape fecha a janela. A prévia de teste foi descartada, sem gravar uma foto fictícia como foto real do produto. O upload real e a substituição com persistência devem ser conferidos quando houver foto apropriada; cargos diferentes ainda precisam de ensaio no banco. Nenhuma quantidade de estoque foi modificada.

O backup lógico já exportado do banco foi feito antes desta migração. Ele não contém os arquivos de Storage. O SQL desta etapa preserva a configuração no código; após enviar fotos reais, incluir cópia privada dos objetos de Storage no plano de backup. Teste de restauração continua adiado pelo usuário.
