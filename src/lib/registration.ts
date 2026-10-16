export const EMAIL_ALREADY_REGISTERED = "Este e-mail já está cadastrado. Use outro e-mail ou entre na conta existente.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function registrationError(error: { code?: string | undefined; message: string }) {
  return error.code === "email_exists" || error.code === "user_already_exists" ||
    /already.*registered|already.*exists|e-mail já está cadastrado/i.test(error.message)
    ? EMAIL_ALREADY_REGISTERED : error.message;
}