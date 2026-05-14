import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { parsePasswordResetVerificationCookie, clearPasswordResetVerificationCookie } from "@/lib/passwordResetVerification";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    password.length <= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&]/.test(password)
  );
};

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const newPassword = String(password ?? "");

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be 8-12 chars and include uppercase, lowercase, number, and special (!@#$%^&)." },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get("cookie");
    const resetVerification = parsePasswordResetVerificationCookie(cookieHeader);

    if (!resetVerification || resetVerification.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "Please verify your email code before setting a new password." },
        { status: 403 }
      );
    }

    const auth = adminAuth();
    if (!auth) {
      return NextResponse.json(
        {
          error:
            "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_ADMIN_PROJECT_ID/FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY.",
        },
        { status: 500 }
      );
    }

    const userRecord = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(userRecord.uid, { password: newPassword });

    // Send confirmation email that password was changed
    try {
      const emailUser = process.env.EMAIL_USER?.trim();
      const emailPassword = process.env.EMAIL_PASSWORD?.replace(/\s+/g, "").trim();

      if (emailUser && emailPassword) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: emailUser, pass: emailPassword },
        });

        await transporter.sendMail({
          from: `CETVOTE <${emailUser}>`,
          to: normalizedEmail,
          subject: "Your CETVOTE password has been reset",
          html: `
            <div style="margin:0;background:#f3f4f8;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
              <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,0.12);">
                <div style="background:linear-gradient(120deg,#f05a28 0%,#fb923c 100%);padding:26px 20px;text-align:left;">
                  <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:1px;font-weight:800;">CETVOTE</h1>
                  <p style="margin:6px 0 0;color:#ffedd5;font-size:13px;">Student Election Portal — Security Notice</p>
                </div>

                <div style="padding:22px 20px;background:#fff;">
                  <p style="margin:0 0 12px;font-size:15px;color:#374151;">Hello,</p>
                  <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">This is a confirmation that the password for your CETVOTE account <strong>${normalizedEmail}</strong> was successfully changed.</p>

                  <div style="margin:14px 0 18px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
                    <p style="margin:0;font-size:13px;color:#9a3412;">If you performed this change, no further action is required.</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#334155;">If you did NOT make this change, please secure your account immediately by resetting your password again and contacting the CETVOTE admin.</p>
                  </div>

                  <p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.5;">For your security, we recommend enabling two-factor authentication (if available) and ensuring your recovery email is up to date.</p>

                  <div style="margin-top:18px;text-align:center;">
                    <a href="https://cetvote.vercel.app/" style="display:inline-block;padding:10px 18px;background:#f05a28;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">Sign in to CETVOTE</a>
                  </div>
                </div>

                <div style="padding:14px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">CETVOTE • HCDC Student Election Portal</p>
                </div>
              </div>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      // Log but do not fail the request, password update succeeded
      console.error("Failed to send password reset confirmation email:", mailErr);
    }

    return NextResponse.json(
      { success: true, message: "Password updated successfully." },
      { headers: { "Set-Cookie": clearPasswordResetVerificationCookie() } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Set-Cookie": clearPasswordResetVerificationCookie() } });
  }
}