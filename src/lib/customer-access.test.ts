import { describe, expect, it } from "vitest";
import { customerAccess } from "./customer-access";

const today = "2026-10-16";

describe("customerAccess", () => {
  it("novo cadastro sem pagamento vai para escolha de plano", () => {
    expect(customerAccess("pendente", [], false, today)).toBe("escolher_plano");
  });
  it("assinatura ativa em dia libera acesso", () => {
    expect(customerAccess("ativo", [{ status: "ativo", next_due_date: "2026-11-01" }], true, today)).toBe("liberado");
  });
  it("mensalidade vencida suspende", () => {
    expect(customerAccess("ativo", [{ status: "ativo", next_due_date: "2026-10-15" }], true, today)).toBe("suspenso");
  });
  it("cliente bloqueado pelo admin fica suspenso mesmo pago", () => {
    expect(customerAccess("bloqueado", [{ status: "ativo", next_due_date: "2026-11-01" }], true, today)).toBe("suspenso");
  });
  it("cliente que já pagou e ficou pendente fica suspenso", () => {
    expect(customerAccess("ativo", [{ status: "pendente", next_due_date: null }], true, today)).toBe("suspenso");
  });
});
