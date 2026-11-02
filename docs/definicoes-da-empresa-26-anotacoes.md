# O que depende da empresa para continuar

Revisão dos 26 itens em 01/11/2026. Pode responder em texto, por grupos, quando tiver as informações. Não enviar senhas ou chaves de acesso. Campos sem definição continuam pendentes; nenhum valor abaixo foi presumido como regra da empresa.

A referência do gráfico já foi decidida: **capacidade física**. O usuário autorizou o cenário local fictício NORTE/SUL/LESTE/OESTE com valores de exemplo; não precisa repetir essa decisão. Dados físicos reais abaixo só serão necessários para substituir a demonstração por referência real.

## 1. Prateleiras, capacidade e separação — 2, 3, 18, 21

| Informação | O que informar |
| --- | --- |
| Códigos reais | Prateleiras existentes, inclusive quais deixaram de ser usadas. |
| Posição | Ordem/corredor/lado de cada prateleira. Um desenho simples com os códigos já ajuda; não precisa de planta profissional. |
| Significado de cheio | **Definido: capacidade física.** Gráfico e configuração local implementados. |
| Capacidade | Limite validado por prateleira e tipo/tamanho de caixa; restrições de peso ou mistura, quando existirem. |
| Testados/não testados | Quais locais ficam destinados a cada situação; se uma mesma prateleira pode conter ambas. |

Um exemplo de formato para preencher, sem valores inventados: `Código: ___; posição: ___; uso permitido: ___; capacidade/unidade: ___; restrições: ___`.

Isso permite implementar mapa, gráfico proporcional e sugestão de espaço. Quantidade zero no sistema continua sem comprovar que existe espaço físico livre.

## 2. Retorno, pedidos e separação — 6, 12, 19

Informar o caminho físico do retorno dos Correios: quem recebe, onde fica em conferência, como identifica o produto/condição e quem autoriza o destino. Distinguir esse retorno de devolução de cliente e Garantia.

Para pedidos: como identificar o pedido, em qual etapa reserva as caixas, quando se considera separado/expedido/vendido e o que acontece em cancelamentos antes e depois da saída física. Informar quem confere e registra motivo/destino. A regra precisa distinguir liberar uma reserva de acrescentar caixas que realmente voltaram.

Para a missão de separação: quem retira, o que a leitura deve identificar (caixa/produto/local) e como tratar quantidade incompleta. A concorrência/reserva compartilhada será implementada no servidor depois das definições.

## 3. Contagem, prazos e rastreabilidade — 13, 17, 20, 22, 23

| Tema | Definição necessária |
| --- | --- |
| Contagem | Quem conta, quem aprova, se podem ser a mesma pessoa e quem pode autorizar ajuste. |
| Movimento durante a contagem | Como coordenar a atividade física: interromper movimentos, recontar ou usar um corte validado. O rascunho atual não reserva saldo. |
| Testagem em atraso | Prazo, marco inicial e se os dias são corridos ou úteis. |
| Divergência recorrente | Quantas ocorrências, em qual intervalo e por produto/prateleira; quem recebe e como resolve o aviso. |
| Retirada incompleta | Como comprovar a etapa física e quando considerar pendente. Pedido sem confirmação de rede não comprova retirada física incompleta. |
| Idade das caixas | Se haverá identificação por caixa ou lote e quais datas/origens reais podem ser comprovadas. Última movimentação de um código não demonstra idade das caixas atuais. |

Essas respostas permitem preparar regras; envio, aprovação, histórico compartilhado e validação transacional também precisam do servidor.

## 4. Equipe, etiquetas, fotos e piloto — 4, 9, 10, 14, 24–26

- Definir as pessoas/funções que vão participar: Administrador, Recebimento, Testador, Estoquista e Consulta. A gestão de usuários adiada só deve ser retomada como etapa própria, com acesso ao serviço de contas.
- Quando retomar etiquetas: decidir o conteúdo legível, tamanho/material e eventual identidade QR por caixa. A etiqueta não substitui o registro de testagem.
- Separar um Windows e um Android para instalar e usar o aplicativo; um iPhone/Safari para o ensaio físico correspondente. O guia de instalação fica nas opções da conta.
- Combinar quem executará o roteiro de piloto e fará a conferência física. Registrar aparelho/navegador, resultado e evidência de cada problema encontrado. Não repetir casos aprovados sem mudança ou nova condição relevante.
- Quando existirem, disponibilizar fotos reais dos produtos. A ausência já informada continua registrada; as imagens atuais seguem identificadas como exemplos.
- Validação manual de acessibilidade: percorrer os fluxos com tecnologia assistiva e registrar dificuldades reais. Auditoria automática já ampliada não substitui esse ensaio.

## 5. O que é trabalho técnico quando o serviço estiver disponível

Não depende de você inventar uma solução técnica: ativação/revisão das permissões e eventos privados (7/16), aprovação e histórico das contagens (17/20), persistência das novas regras e testes de integração serão responsabilidade da implementação. Precisam de acesso autorizado ao serviço e, nos fluxos acima, das definições operacionais primeiro.

## 6. Transição final — 8

Identificar o que é real e precisa ser preservado e combinar a data da transição. A limpeza dos exemplos só será executada no final, com cópia verificável e plano concreto aprovado. Nada deve ser apagado agora para adiantar essa etapa.

## Escopos entregues

1, 5, 11 e 15 entregues nos escopos documentados; 24 entregue quanto à preparação do roteiro. Os demais recortes entregues/publicados estão discriminados em `progresso-26-anotacoes.md`. Não é necessário redefinir esses escopos para continuar, nem repetir seus testes por causa desta lista.
