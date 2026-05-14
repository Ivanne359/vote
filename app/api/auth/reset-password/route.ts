import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { parsePasswordResetVerificationCookie, clearPasswordResetVerificationCookie } from "@/lib/passwordResetVerification";

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

    return NextResponse.json(
      { success: true, message: "Password updated successfully." },
      { headers: { "Set-Cookie": clearPasswordResetVerificationCookie() } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Set-Cookie": clearPasswordResetVerificationCookie() } });
  }
}