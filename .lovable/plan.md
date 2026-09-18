# Painel completo do vendedor

## Objetivo
Transformar o painel atual em uma área comercial completa, responsiva e integrada ao Cartão do Bairro, mantendo cada vendedor restrito aos próprios dados.

## Experiência do vendedor
- Reorganizar o menu para: Dashboard, Nova Venda, Meus Clientes, Comissões, Minhas Vendas, Metas, Meu Link, Meu QR Code, Notificações e Meu Perfil.
- Atualizar o Dashboard com foto, nome, status, período Hoje/Semana/Mês, seis indicadores, gráficos de vendas e comissões, meta mensal e atividades recentes.
- Criar “Nova Venda” como proposta: dados completos do cliente, endereço, plano, data e observações; ao concluir, gerar um link individual para envio pelo WhatsApp. O cliente cria sua própria senha e conclui o pagamento no fluxo InfinitePay já existente.
- Criar listas pesquisáveis e filtráveis de clientes, vendas e comissões, com situações, datas, planos, valores, vencimentos e responsável.
- Criar áreas dedicadas para meta mensal, link de indicação, QR Code, notificações e edição do perfil/dados bancários.
- Disponibilizar ações rápidas para copiar e compartilhar o link por WhatsApp, Instagram e Facebook.

## Regras e automações
- Vincular automaticamente cadastros originados por link, QR Code ou proposta ao vendedor responsável.
- Impedir propostas duplicadas por CPF, e-mail ou WhatsApp.
- Calcular comissão no servidor com a regra configurada pelo administrador; o vendedor nunca informa nem altera o valor.
- Registrar venda, comissão, data/hora e histórico quando o cliente concluir a adesão/pagamento.
- Atualizar indicadores e notificações automaticamente a partir das vendas, pagamentos, metas e comissões existentes.
- Manter o ranking mensal disponível somente na administração, com vendas e comissão por vendedor.

## Segurança e dados
- Reforçar as permissões para que vendedores leiam e alterem apenas seus próprios clientes comerciais, propostas, vendas, metas, comissões, notificações e perfil.
- Administradores mantêm visão geral e edição das regras de comissão e metas.
- Guardar dados bancários com acesso exclusivo do próprio vendedor e administradores autorizados.
- Registrar alterações relevantes em histórico auditável.

## Implementação técnica
- Evoluir as estruturas atuais de vendedores, leads, vendas, comissões, metas e notificações por migração, preservando dados existentes.
- Criar funções autenticadas para concluir propostas e calcular comissões de forma confiável.
- Reutilizar o fluxo público de cadastro e pagamento, aceitando um identificador seguro da proposta/vendedor.
- Usar os componentes visuais e tokens atuais, com laranja, preto e branco, gráficos Recharts e QR Code já disponíveis no projeto.
- Adicionar metadados próprios às novas páginas e validar os fluxos em celular e computador.

## Validação
- Testar isolamento entre vendedores, criação e compartilhamento de proposta, atribuição por link/QR Code, cálculo da comissão e atualização dos indicadores.
- Testar filtros, buscas, edição de perfil e visualização administrativa do ranking.
- Verificar compilação, erros no navegador e os principais tamanhos de tela.
