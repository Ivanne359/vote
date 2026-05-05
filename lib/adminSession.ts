import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

type AdminAuthConfig = {
  email: string;
  password: string;
  sessionSecret: string;
};

type AdminSessionPayload = {
  email: string;
  expiresAt: number;
};

const readAdminAuthConfig = (): AdminAuthConfig | null => {
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";

  if (!email || !password || !sessionSecret) {
    return null;
  }

  return {
    email,
    password,
    sessionSecret,
  };
};

const encodePayload = (payload: AdminSessionPayload) => Buffer.from(JSON.stringify(payload)).toString("base64url");

const decodePayload = (value: string): AdminSessionPayload | null => {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    if (typeof parsed.email !== "string" || typeof parsed.expiresAt !== "number") {
      return null;
    }

    return {
      email: parsed.email,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

const signPayload = (payload: string, secret: string) => {
  return createHmac("sha256", secret).update(payload).digest("base64url");
};

export const createAdminSessionToken = (email: string) => {
  const config = readAdminAuthConfig();
  if (!config) {
    throw new Error("Admin auth is not configured.");
  }

  const payload = {
    email,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  } satisfies AdminSessionPayload;
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, config.sessionSecret);

  return `${encodedPayload}.${signature}`;
};

export const verifyAdminSessionToken = (token: string | undefined) => {
  if (!token) {
    return null;
  }

  const config = readAdminAuthConfig();
  if (!config) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, config.sessionSecret);
  const providedSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignature.length !== expectedSignatureBuffer.length || !timingSafeEqual(providedSignature, expectedSignatureBuffer)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload || payload.email !== config.email || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
};

export const validateAdminCredentials = (email: string, password: string) => {
  const config = readAdminAuthConfig();
  if (!config) {
    return false;
  }

  return email === config.email && password === config.password;
};

export const getAdminSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_TTL_SECONDS,
});
