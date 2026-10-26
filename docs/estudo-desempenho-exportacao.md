# Desempenho, interface e exportação — 26/10/2026

## Alterações locais

`App.tsx` mantém autenticação; `InventoryApp.tsx` reúne a interface operacional. React `lazy(() => import(...))` baixa a interface após carregar o perfil e cada módulo na primeira abertura. As declarações lazy ficam fora dos componentes para preservar sua identidade. `Suspense` apresenta espera; `ModuleBoundary` apresenta erro sem disparar operações ou apagar o menu. Recarregar continua sendo uma ação explícita do usuário; a recuperação de saídas mantém sua regra por conta/aba.

JavaScript inicial do build: de aproximadamente 582.690 para 442.979 bytes, redução de 24%. São tamanhos dos arquivos, não medição de tempo de rede. CSS inicial ficou em aproximadamente 25 KB, com estilos de páginas separados. `scripts/check-performance.mjs` percorre o manifesto real do build e recusa módulos operacionais no grafo inicial. Requer `npm run build` antes.

Os exemplos PNG originais foram preservados. Miniaturas WebP somam 3.032 bytes; versões maiores somam 50.034 bytes. O diálogo pede a imagem maior somente ao abrir. Não houve alteração de fotos privadas ou upload. Componentes usam imagens com dimensões e decodificação assíncrona. Estilos compartilhados foram mantidos disponíveis antes da abertura das páginas que os definiam.

## Revisão de interface

Adicionados link “Ir para o conteúdo”, foco de teclado consistente, identificação da página atual para tecnologia assistiva e respeito à preferência de movimento reduzido. A revisão não constitui auditoria completa de acessibilidade nem teste de iPhone físico.

## CSV

Botões disponíveis em Estoque geral, Garantia por fabricante e detalhamento de Giro/ABC. Exportam somente os dados já consultados e exibidos para a conta; não fazem novas consultas administrativas e não mudam permissões. Estoque contém linhas positivas por localização/situação; garantia contém fabricantes filtrados; giro contém linhas filtradas sem recalcular a classificação. Atualize a consulta antes de usar o arquivo para decisões. Exportação não é backup.

`src/lib/csv.ts` monta UTF-8 com BOM, separador ponto e vírgula, aspas duplicadas e números com vírgula decimal. Texto que pode ser interpretado como fórmula recebe apóstrofo. `Blob` contém o arquivo; `URL.createObjectURL` cria um endereço temporário; um link com `download` solicita o salvamento ao navegador. O endereço é liberado depois. O aviso “Arquivo preparado” não garante onde o navegador salvou o arquivo.

## Verificações já realizadas

- Compilação passou após divisão dos módulos e inclusão dos CSV. Lint conserva os três avisos React preexistentes.
- Dezesseis casos de recuperação de saída passaram após a separação da interface; não houve nova rodada no banco.
- Lógica/contratos de ABC e testes de CSV passaram. CSV cobre aspas, acentos, quebras de linha, decimais, nulos, fórmulas, números inválidos, colunas incompatíveis e limpeza do endereço em sucesso/falha.
- Navegador local abriu Produtos, Giro/ABC, Garantia, Molas, Saídas, Histórico, Aplicações e Painel. Miniaturas WebP apareceram; download de estoque chegou ao aviso de arquivo preparado.
- Laboratório `tests/module-loading/` conferiu espera, conclusão, rejeição de carregamento e retorno à página inicial. Sem Supabase. É uma rejeição simulada de módulo, não desconexão real da rede.

## Onde continuar

Conferir ampliação WebP, downloads reais de garantia/ABC e conteúdo dos arquivos; terminar revisão de teclado e tela estreita. Acrescentar casos de sessão expirada/consulta vazia conforme a área alterada, sem repetir os testes já registrados. Organizar roteiro do piloto. Usuários, etiquetas, restauração e logins reais dos demais cargos continuam adiados. Novas mudanças ainda são locais e precisam de push e conferência na Vercel.
