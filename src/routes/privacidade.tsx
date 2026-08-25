import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./termos";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Cartão do Bairro" },
      {
        name: "description",
        content: "Como o Cartão do Bairro coleta, usa e protege seus dados pessoais conforme a LGPD.",
      },
      { property: "og:title", content: "Política de privacidade — Cartão do Bairro" },
      { property: "og:description", content: "Tratamento de dados pessoais conforme a LGPD." },
    ],
  }),
  component: () => (
    <LegalPage title="Política de privacidade">
      <p>
        Tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>
      <h2>Dados coletados</h2>
      <p>
        Nome, CPF, data de nascimento, contatos, endereço, documentos enviados para validação
        cadastral, histórico de pagamentos e de utilização de benefícios.
      </p>
      <h2>Finalidade</h2>
      <p>
        Identificar o associado nos parceiros, emitir o cartão digital, processar cobranças, prevenir
        fraudes e melhorar a rede de benefícios.
      </p>
      <h2>Compartilhamento</h2>
      <p>
        Parceiros visualizam apenas os dados necessários para validar o cartão: nome, número do
        cartão, status, validade e benefício utilizado.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode consultar, corrigir, exportar ou solicitar a exclusão dos seus dados diretamente no
        aplicativo, em Minha Conta. Dados financeiros e fiscais são mantidos pelo prazo legal.
      </p>
      <h2>Segurança</h2>
      <p>
        Senhas são armazenadas com criptografia, o acesso é controlado por perfis e permissões e
        todas as alterações críticas ficam registradas em log de auditoria.
      </p>
    </LegalPage>
  ),
});
