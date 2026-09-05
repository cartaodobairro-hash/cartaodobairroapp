/**
 * Entrada por biometria (Face ID / digital) usando o autenticador do próprio
 * aparelho. Depois de um login com senha, guardamos localmente o token de
 * sessão protegido por uma credencial biométrica criada no dispositivo.
 */
const CRED_KEY = "cdb_bio_cred";
const TOKEN_KEY = "cdb_bio_token";
const LABEL_KEY = "cdb_bio_label";

function toBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export function biometricSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function biometricAvailable() {
  if (!biometricSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function biometricEnrolled() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(CRED_KEY) && !!localStorage.getItem(TOKEN_KEY);
}

export function biometricLabel() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LABEL_KEY);
}

export function biometricForget() {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LABEL_KEY);
}

export function biometricUpdateToken(refreshToken: string) {
  if (biometricEnrolled()) localStorage.setItem(TOKEN_KEY, refreshToken);
}

export async function biometricEnroll(params: {
  userId: string;
  label: string;
  refreshToken: string;
}) {
  if (!(await biometricAvailable())) throw new Error("Este aparelho não tem biometria disponível.");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Cartão do Bairro", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(params.userId),
        name: params.label,
        displayName: params.label,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Não foi possível ativar a biometria.");

  localStorage.setItem(CRED_KEY, toBase64(credential.rawId));
  localStorage.setItem(TOKEN_KEY, params.refreshToken);
  localStorage.setItem(LABEL_KEY, params.label);
}

/** Pede a biometria e devolve o token de sessão guardado. */
export async function biometricUnlock(): Promise<string> {
  const credId = localStorage.getItem(CRED_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!credId || !token) throw new Error("Biometria não configurada neste aparelho.");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: fromBase64(credId), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error("Biometria não reconhecida.");
  return token;
}
