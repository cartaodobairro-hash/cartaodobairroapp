# Excluir assinatura e mensalidades

## Resultado
- Adicionar um botão **Excluir assinatura** em cada assinatura, visível somente para administradores.
- Exibir uma confirmação informando que a assinatura e todas as mensalidades vinculadas serão removidas definitivamente.
- Após confirmar, atualizar imediatamente a lista, os totais e os dados financeiros exibidos.

## Segurança e dados
- Validar novamente no servidor se a pessoa possui papel de administrador; esconder o botão na tela não será a única proteção.
- Remover as mensalidades vinculadas e a assinatura na mesma operação, evitando exclusão parcial.
- Não excluir o cadastro do cliente nem o cartão; apenas a assinatura selecionada e suas mensalidades.

## Validação
- Conferir abertura e cancelamento da confirmação.
- Conferir exclusão e atualização da tela.
- Validar que usuários sem papel administrativo não conseguem executar a ação.
