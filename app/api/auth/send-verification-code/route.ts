import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

const CODE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

type VerificationEntry = {
  email: string;
  codeHash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  lockedUntil: number | null;
};

const generateVerificationCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const hashVerificationCode = (email: string, code: string, salt: string): string => {
  return createHash("sha256").update(`${email}:${code}:${salt}`).digest("hex");
};

const safeCompareHashes = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
};

const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((pair) => {
    const [rawName, ...rest] = pair.split("=");
    const name = rawName?.trim();
    const value = rest.join("=").trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
};

const createVerificationCookieValue = (entry: VerificationEntry): string => {
  return encodeURIComponent(Buffer.from(JSON.stringify(entry), "utf8").toString("base64"));
};

const parseVerificationCookieValue = (value: string | undefined | null): VerificationEntry | null => {
  if (!value) return null;

  try {
    const decoded = Buffer.from(decodeURIComponent(value), "base64").toString("utf8");
    return JSON.parse(decoded) as VerificationEntry;
  } catch (error) {
    return null;
  }
};

const createCookieHeader = (value: string, maxAge: number): string => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `cetvote_verification=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

const clearCookieHeader = (): string => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `cetvote_verification=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.endsWith("@hcdc.edu.ph")) {
      return NextResponse.json(
        { error: "Only @hcdc.edu.ph email addresses are allowed" },
        { status: 400 }
      );
    }

    const code = generateVerificationCode();
    const expiresAt = Date.now() + CODE_TTL_MS;
    const salt = randomBytes(16).toString("hex");
    const codeHash = hashVerificationCode(normalizedEmail, code, salt);

    const verificationEntry: VerificationEntry = {
      email: normalizedEmail,
      codeHash,
      salt,
      expiresAt,
      attempts: 0,
      lockedUntil: null,
    };

    const cookieValue = createVerificationCookieValue(verificationEntry);
    const cookieHeader = createCookieHeader(cookieValue, CODE_TTL_MS / 1000);

    try {
      const emailUser = process.env.EMAIL_USER?.trim();
      const emailPassword = process.env.EMAIL_PASSWORD?.replace(/\s+/g, "").trim();

      if (!emailUser || !emailPassword) {
        return NextResponse.json(
          { error: "Email sender is not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env.local." },
          { status: 500 }
        );
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      await transporter.sendMail({
        from: `CETVOTE <${emailUser}>`,
        to: normalizedEmail,
        subject: "CETVOTE Verification Code",
        html: `
          <div style="margin:0;background:#f3f4f8;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,0.12);">
              <div style="background:linear-gradient(120deg,#f05a28 0%,#fb923c 100%);padding:28px 24px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:30px;letter-spacing:1px;font-weight:800;">CETVOTE</h1>
                <p style="margin:8px 0 0;color:#ffedd5;font-size:13px;">Secure Student Election Verification</p>
              </div>

              <div style="padding:28px 24px 24px;background:#fff;">
                <p style="margin:0 0 12px;font-size:15px;color:#4b5563;">Hi,</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
                  Use this 6-digit code to continue your Google sign-in on CETVOTE.
                </p>

                <div style="margin:0 auto 18px;max-width:320px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px 16px;text-align:center;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#9a3412;font-weight:700;margin-bottom:8px;">Verification Code</div>
                  <div style="font-size:40px;line-height:1;font-weight:800;letter-spacing:8px;color:#c2410c;">${code}</div>
                </div>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#334155;">
                    Expires in <strong>3 minutes</strong>.
                  </p>
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
                    For your security, never share this code with anyone. CETVOTE support will never ask for this code.
                  </p>
                </div>

                <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </div>

              <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">CETVOTE • HCDC Student Election Portal</p>
              </div>
            </div>
          </div>
        `,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Verification code sent to your email",
        },
        { headers: { "Set-Cookie": cookieHeader } }
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return NextResponse.json(
        { error: "Unable to send verification code email. Check EMAIL_USER/EMAIL_PASSWORD (Gmail App Password) and try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { email, code } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedCode = String(code ?? "").trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits" },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const stored = parseVerificationCookieValue(cookies["cetvote_verification"]);

    if (!stored || stored.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "No verification code found for this email" },
        { status: 400, headers: { "Set-Cookie": clearCookieHeader() } }
      );
    }

    if (stored.lockedUntil && Date.now() < stored.lockedUntil) {
      const retryAfterSeconds = Math.ceil((stored.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${retryAfterSeconds}s.` },
        { status: 429, headers: { "Set-Cookie": createCookieHeader(createVerificationCookieValue(stored), Math.max(Math.ceil((stored.expiresAt - Date.now()) / 1000), 1)) } }
      );
    }

    if (Date.now() > stored.expiresAt) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400, headers: { "Set-Cookie": clearCookieHeader() } }
      );
    }

    const computedHash = hashVerificationCode(normalizedEmail, normalizedCode, stored.salt);
    if (!safeCompareHashes(stored.codeHash, computedHash)) {
      const updatedAttempts = stored.attempts + 1;
      const attemptsLeft = Math.max(MAX_VERIFY_ATTEMPTS - updatedAttempts, 0);
      const updatedStored: VerificationEntry = {
        ...stored,
        attempts: updatedAttempts,
        lockedUntil: updatedAttempts >= MAX_VERIFY_ATTEMPTS ? Date.now() + LOCKOUT_MS : null,
      };
      const updatedCookie = createCookieHeader(
        createVerificationCookieValue(updatedStored),
        Math.max(Math.ceil((updatedStored.expiresAt - Date.now()) / 1000), 1)
      );

      return NextResponse.json(
        {
          error:
            updatedAttempts >= MAX_VERIFY_ATTEMPTS
              ? "Too many invalid attempts. Verification is temporarily locked."
              : `Invalid verification code. ${attemptsLeft} attempt(s) left.`,
        },
        { status: 400, headers: { "Set-Cookie": updatedCookie } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
      },
      { headers: { "Set-Cookie": clearCookieHeader() } }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
