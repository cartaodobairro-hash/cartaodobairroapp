export const EMAIL_ALREADY_REGISTERED = "Este e-mail já está cadastrado. Use outro e-mail ou entre na conta existente.";

export const CPF_ALREADY_REGISTERED = "Este CPF já está cadastrado. Entre na conta existente ou recupere sua senha.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function registrationError(error: { code?: string | undefined; message: string }) {
  if (/CPF já está cadastrado/i.test(error.message)) return CPF_ALREADY_REGISTERED;
  return error.code === "email_exists" || error.code === "user_already_exists" ||
    /already.*registered|already.*exists|e-mail já está cadastrado/i.test(error.message)
    ? EMAIL_ALREADY_REGISTERED : error.message;
}