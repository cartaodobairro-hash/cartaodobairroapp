# Edição administrativa de vendedores

## Objetivo
Permitir que somente administradores editem um vendedor já cadastrado diretamente na tela de Vendedores.

## Alterações
- Adicionar um botão de editar em cada vendedor, ao lado da exclusão.
- Abrir um formulário preenchido com os dados atuais do vendedor.
- Permitir editar nome, código, CPF, contatos, localização, comissão, meta, status e dados bancários.
- Salvar por uma ação protegida no servidor, validando a função administrativa antes da alteração.
- Atualizar imediatamente a lista e o ranking após salvar.

## Segurança e validação
- O servidor confirmará que o usuário possui papel administrativo.
- O vendedor não poderá alterar as próprias regras comerciais por esse fluxo.
- Código do vendedor continuará único e valores de comissão/meta serão validados.

## Verificação
- Confirmar abertura do formulário com os dados existentes.
- Salvar uma alteração segura e verificar a atualização da tela.
- Validar a tela em computador e celular sem excluir ou modificar vendas existentes.
