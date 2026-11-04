export const EMAIL_ALREADY_REGISTERED = "Este e-mail já está cadastrado. Use outro e-mail ou entre na conta existente.";

export const CPF_ALREADY_REGISTERED = "Este CPF já está cadastrado. Entre na conta existente ou recupere sua senha.";

export const PHONE_ALREADY_REGISTERED = "Este telefone já está cadastrado. Entre na conta existente ou recupere sua senha.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function registrationError(error: { code?: string | undefined; message: string }) {
  if (/CPF já está cadastrado/i.test(error.message)) return CPF_ALREADY_REGISTERED;
  if (/telefone já está cadastrado/i.test(error.message)) return PHONE_ALREADY_REGISTERED;
  if (error.code === "weak_password" || /weak|easy to guess|pwned/i.test(error.message))
    return "Essa senha é muito comum e fácil de adivinhar. Crie uma senha diferente, misturando letras e números (ex.: Bairro2026Maria).";
  if (/at least \d+ characters|password.*short/i.test(error.message))
    return "A senha é muito curta. Use pelo menos 6 caracteres.";
  return error.code === "email_exists" || error.code === "user_already_exists" ||
    /already.*registered|already.*exists|e-mail já está cadastrado/i.test(error.message)
    ? EMAIL_ALREADY_REGISTERED : error.message;
}