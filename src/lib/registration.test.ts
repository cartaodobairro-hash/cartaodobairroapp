import { describe, expect, it } from "vitest";
import { normalizeEmail, registrationError, EMAIL_ALREADY_REGISTERED } from "./registration";

describe("global account email", () => {
  it("ignores surrounding whitespace and letter case", () => {
    expect(normalizeEmail("  Cliente@Example.COM  ")).toBe("cliente@example.com");
  });
  it("recognizes duplicate login email", () => {
    expect(registrationError({ code: "email_exists", message: "Duplicate" })).toBe(EMAIL_ALREADY_REGISTERED);
  });
  it("recognizes duplicate profile email", () => {
    expect(registrationError({ message: "Este e-mail já está cadastrado." })).toBe(EMAIL_ALREADY_REGISTERED);
  });
  it("does not label unrelated errors as duplicates", () => {
    expect(registrationError({ message: "Connection failed" })).toBe("Connection failed");
  });
});