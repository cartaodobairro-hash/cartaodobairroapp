# Módulo Fluxo de Caixa

## Objetivo
Criar no painel administrativo uma visão financeira mensal e diária que combine projeções e valores realizados, permitindo responder rapidamente quanto entra, quanto sai e qual será o saldo nos próximos 12 meses.

## O que será construído

### 1. Base financeira segura
- Criar categorias financeiras, lançamentos manuais e saldos iniciais mensais.
- Restringir leitura e alterações ao administrador/financeiro usando as permissões atuais.
- Permitir receitas e despesas únicas ou recorrentes, com vencimento, previsão, pagamento, forma, situação e observações.
- Preencher as categorias padrão solicitadas.

### 2. Integração sem duplicação
- Usar `payments` como fonte das mensalidades previstas/recebidas.
- Projetar assinaturas ativas segundo o plano e vencimento para os próximos 12 meses, sem gravar cópias.
- Usar `seller_commissions` como despesas previstas/pagas de comissão.
- Somar aos dados existentes apenas receitas extras e despesas cadastradas no novo módulo.

### 3. Dashboard executivo
- Adicionar “Fluxo de Caixa” ao lado de “Financeiro” no menu administrativo.
- Criar seletores de ano, mês e período, incluindo intervalo personalizado.
- Exibir previsto a receber, recebido, previsto a pagar, pago, saldos projetado/realizado e pendências.
- Gerar análise automática de saúde financeira com base no período selecionado.
- Exibir indicadores de receita, despesas, resultado, clientes, assinaturas, inadimplência, ticket médio e recorrência.

### 4. Análises e projeções
- Gráfico de evolução mensal por 12 meses com modos Previsto, Realizado e Comparativo.
- Tabela mensal clicável e detalhamento diário do mês escolhido.
- Comparação entre mês atual e anterior, com valores e percentuais.
- Previsões em +1, +2, +3, +6 e +12 meses.
- Alertas de vencimentos, atrasos, inadimplência, queda de receita, aumento de despesas, comissões e risco de caixa negativo.

### 5. Gestão de lançamentos
- Abas de Contas a Receber e Contas a Pagar.
- Cadastro e edição em janela, filtros por tipo, situação, categoria, pessoa/empresa, vendedor e forma de pagamento.
- Ações para marcar receita como recebida e despesa como paga, mantendo a data efetiva.
- Cadastro de saldo inicial e cálculo automático dos saldos final e projetado.

### 6. Relatórios
- Exportar a visão filtrada para Excel em arquivo compatível com planilhas.
- Criar versão de impressão que também permita salvar como PDF pelo navegador.
- Incluir fluxo mensal, receitas, despesas, comissões e resultado financeiro.

### 7. Validação
- Conferir cálculos com os dados reais existentes.
- Testar ações administrativas e estados vazios.
- Validar legibilidade e navegação em computador e celular.
- Finalizar e validar as janelas de edição e comprovante já iniciadas na ficha do cliente para manter o painel sem controles incompletos.

## Detalhes técnicos
- Novas tabelas serão criadas por migração, com `GRANT`, RLS e políticas administrativas na ordem exigida.
- O painel derivará uma linha financeira unificada no cliente a partir das fontes existentes e dos lançamentos manuais.
- Situações vencidas serão calculadas pela data quando o lançamento ainda não estiver pago ou cancelado.
- Recorrências manuais serão expandidas em memória apenas dentro do horizonte selecionado, evitando registros duplicados.
- Os gráficos usarão a biblioteca já instalada e as cores semânticas atuais do Cartão do Bairro.
