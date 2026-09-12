# Dashboard analítico de parceiros

## Objetivo
Criar uma visão administrativa completa de cada parceiro, atualizada em tempo real, mostrando cadastro, clientes atendidos, compras e descontos, sem criar lançamentos nem alterar cálculos do Fluxo de Caixa.

## O que será entregue
- Transformar a lista de parceiros em um resumo analítico com busca e indicadores de atendimentos, clientes únicos, compras registradas e descontos concedidos.
- Adicionar uma página de detalhes para cada parceiro com:
  - dados completos do cadastro e situação;
  - indicadores gerais e do mês;
  - histórico dos atendimentos;
  - clientes atendidos, benefício utilizado, valor da compra e desconto;
  - evolução mensal e comparação dos resultados.
- Incluir acesso claro ao painel individual a partir de cada parceiro.
- Atualizar a validação do cartão para registrar separadamente o valor total da compra e o desconto aplicado.
- Atualizar automaticamente os painéis quando um novo atendimento for registrado.

## Regras
- Os valores serão exclusivamente analíticos e não entrarão no Fluxo de Caixa, pagamentos, assinaturas ou comissões.
- Dados pessoais completos continuarão visíveis apenas para administradores autorizados.
- Registros antigos sem valor da compra continuarão aparecendo, com o campo indicado como não informado.
- “Clientes atendidos” contará clientes únicos; “Atendimentos” contará todas as utilizações.

## Detalhes técnicos
- Adicionar `purchase_amount` ao registro de uso do cartão, com validação para valores não negativos e desconto nunca superior à compra.
- Preservar as políticas atuais e conceder somente o acesso já previsto para administradores e o parceiro proprietário.
- Usar consultas agregadas sobre `card_usage`; não gravar dados em `cash_flow_entries`.
- Criar a rota administrativa individual do parceiro e atualizar tipos, navegação e consultas.
- Validar compilação e conferir a lista e o painel individual em computador e celular.
