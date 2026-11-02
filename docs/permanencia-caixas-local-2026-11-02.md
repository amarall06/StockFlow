# Anotação 23 — permanência das caixas na apresentação

02/11/2026. Novo recorte de tempo desde entrada do grupo, diferente da consulta de última movimentação já entregue. Sem Supabase.

## Acesso e cenário

Painel → Visualização do Painel → Apresentação → Permanência das caixas.

Dez grupos de entrada de exemplo representam exatamente as 85 caixas da apresentação, por produto/prateleira/situação: 20 AGM-35 aguardando em NORTE; 20 AGM-35 liberados em NORTE; 12 MGM-35 em estoque em SUL; 33 AGM-35 liberados em LESTE. Identificações E-01 a E-10 são grupos do cenário, não etiquetas físicas únicas de cada caixa.

Referência fixa e visível 02/11/2026. Tempo calculado em dias corridos desde a entrada registrada, não desde última venda/movimentação e não data de fabricação. Troca de prateleira não reinicia a data de entrada. Sem data não se estima idade; data futura exige conferência. Grupos incompatíveis com os saldos ou datas impossíveis bloqueiam a avaliação.

Limite inicial da apresentação: 90 dias, configurável de 1 a 3650 pelo Administrador nesta conta/navegador. O limite exato é incluído (90 dias é destacado com limite 90). Com 90: 35 caixas atingem o limite, 35 ficam abaixo, 15 sem data. Com 30: 44 atingem, 26 abaixo, 15 sem data. Molas: 9 caixas desde 01/09 e 3 desde 28/10. Grupos mais antigos aparecem primeiro, com identificação, produto, situação, local, caixas e entrada. Filtro por categoria e localização no mapa existentes integrados.

Sem recomendar venda, descarte, transferência ou ajuste automático. A configuração de exemplo não define regra operacional da empresa. Nenhuma origem/dado real é criado e nenhum estoque é alterado. Não deduz idade física do saldo real a partir deste cenário.

## Código

- `src/lib/stock-age.ts`: grupos/data de referência, reconciliação integral por produto/local/situação com o saldo do cenário, cálculo de dias, ordenação e configuração local versionada/por conta. Detecta grupos duplicados, falta/sobra de caixas e datas impossíveis. Gravação compara cópia e confirma leitura; não equivale a reserva ou transação global.
- `src/components/StockAge.tsx` e CSS: cartões de grupo, totais por situação, filtro por categoria, mapa e configuração para Administrador. Consulta filtra e lê sem editar. Configuração ilegível preserva dados e bloqueia cálculo; falha de gravação conserva regra anterior e preenchimento.
- `StockPresentation.tsx`: integração no Painel original com identidade local da apresentação. Categoria usa a regra compartilhada do projeto para amortecedores/molas.

## Somente verificações novas

`scripts/check-stock-age.mjs` aprovado: totais conhecidos/desconhecidos e limites 90/30, ordenação/idade, inclusão do limite exato, mudança de local preservando entrada, data futura/impossível, grupos duplicados/incompletos/situação incompatível, limite inválido, imutabilidade, isolamento por conta, versão concorrente, quota e limpeza de assinatura.

Sete testes novos em `tests/browser/stock-age.spec.ts`, aprovados em 20,5 s: grupos/entrada/desconhecidos/mapa sem escrita; limite/filtros/recarga; falha de gravação; dados ilegíveis preservados; Consulta; teclado/auditoria automática A/AA em 375 px nos temas claro/escuro. API simulada; sem contas ou dados reais. Compilação e análise aprovadas. Nenhum teste anterior executado.

## Pode riscar e falta

Pode riscar implementação/testes do protótipo de permanência por entrada registrada e grupos de exemplo da 23. Faltam identidade real por caixa/lote, procedência e datas comprováveis, conservação dos vínculos nas entradas/transferências/saídas/devoluções, histórico/persistência compartilhados, migração dos saldos sem origem sem inventar datas, política operacional e piloto. A última movimentação conhecida continua uma informação diferente. Não riscar a 23 inteira.
