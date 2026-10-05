import { NextResponse } from "next/server";
import { getAdminCredentials } from "@/lib/auth";
import { isAdminAuthenticated } from "@/lib/auth-server";

export async function GET() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    email: getAdminCredentials().email,
  });
}
