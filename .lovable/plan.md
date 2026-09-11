# Cadastro de acesso para parceiros

## Objetivo
Adicionar ao cadastro de parceiro uma aba para criar o acesso com e-mail e senha, permitindo que a empresa entre na área de parceiros após confirmar o e-mail.

## Implementação
- Dividir o formulário em duas abas: **Empresa** e **Acesso**.
- Manter os dados comerciais na primeira aba e adicionar e-mail de acesso, senha e confirmação na segunda.
- Validar campos obrigatórios, formato do e-mail, senha mínima e confirmação antes do envio.
- Ao enviar, criar a conta com perfil de parceiro e cadastrar a empresa como pendente em uma única operação de cadastro.
- Para quem já estiver conectado, mostrar a conta vinculada e enviar somente os dados da empresa.
- Após o cadastro, orientar a confirmação do e-mail e direcionar o parceiro para entrar na conta.

## Segurança e dados
- O cadastro automático da empresa será feito no banco somente quando a nova conta tiver sido criada como parceiro.
- A empresa continuará pendente até aprovação administrativa.
- Senhas serão tratadas apenas pelo sistema de autenticação e nunca serão gravadas na tabela da empresa.

## Validação
- Corrigir qualquer erro de compilação encontrado.
- Testar alternância das abas, validações e estados para usuário conectado e não conectado.
