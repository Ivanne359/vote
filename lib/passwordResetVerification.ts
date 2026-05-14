const PASSWORD_RESET_VERIFICATION_COOKIE_NAME = "cetvote_password_reset";

type PasswordResetVerificationCookie = {
  email: string;
  expiresAt: number;
};

const encodeCookieValue = (payload: PasswordResetVerificationCookie) => {
  return encodeURIComponent(Buffer.from(JSON.stringify(payload), "utf8").toString("base64"));
};

const decodeCookieValue = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(decodeURIComponent(value), "base64").toString("utf8")) as PasswordResetVerificationCookie;
  } catch {
    return null;
  }
};

export const createPasswordResetVerificationCookie = (email: string, maxAgeSeconds: number) => {
  const normalizedEmail = email.trim().toLowerCase();
  const payload: PasswordResetVerificationCookie = {
    email: normalizedEmail,
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PASSWORD_RESET_VERIFICATION_COOKIE_NAME}=${encodeCookieValue(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
};

export const parsePasswordResetVerificationCookie = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return null;
  }

  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [rawName, ...rest] = pair.split("=");
    const name = rawName?.trim();
    const value = rest.join("=").trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  const parsed = decodeCookieValue(cookies[PASSWORD_RESET_VERIFICATION_COOKIE_NAME]);
  if (!parsed) {
    return null;
  }

  if (Date.now() > parsed.expiresAt) {
    return null;
  }

  return parsed;
};

export const clearPasswordResetVerificationCookie = () => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PASSWORD_RESET_VERIFICATION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};