import { describe, expect, it } from "vitest";
import { planSwitchBlocked } from "./plan-change";

const FAMILY = "plan-family";
const INDIVIDUAL = "plan-individual";

describe("planSwitchBlocked", () => {
  it("bloqueia trocar de plano com assinatura ativa", () => {
    expect(planSwitchBlocked({ status: "ativo", plan_id: FAMILY }, INDIVIDUAL)).toBe(true);
  });
  it("permite manter o plano atual (pagar mensalidade)", () => {
    expect(planSwitchBlocked({ status: "ativo", plan_id: FAMILY }, FAMILY)).toBe(false);
  });
  it("permite contratar sem assinatura", () => {
    expect(planSwitchBlocked(null, FAMILY)).toBe(false);
  });
  it("permite escolher outro plano com assinatura pendente", () => {
    expect(planSwitchBlocked({ status: "pendente", plan_id: FAMILY }, INDIVIDUAL)).toBe(false);
  });
  it("permite recontratar com assinatura cancelada", () => {
    expect(planSwitchBlocked({ status: "cancelado", plan_id: FAMILY }, INDIVIDUAL)).toBe(false);
  });
});
