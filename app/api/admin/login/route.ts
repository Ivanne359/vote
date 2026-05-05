import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  validateAdminCredentials,
} from "@/lib/adminSession";

export async function POST(request: Request) {
  let payload: { email?: string; password?: string } = {};

  try {
    payload = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(email), getAdminSessionCookieOptions());

  return response;
}
