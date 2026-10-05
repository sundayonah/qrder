export const SESSION_COOKIE = "qrder_admin";

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "qrder-dev-secret"
  );
}

function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL ?? "xhunteq@gmail.com",
    password: process.env.ADMIN_PASSWORD ?? "Password.@1",
  };
}

export function verifyCredentials(email: string, password: string) {
  const expected = getAdminCredentials();
  return (
    email.trim().toLowerCase() === expected.email.toLowerCase() &&
    password === expected.password
  );
}

export { getAdminCredentials };

async function hmacHex(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken() {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `admin:${exp}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmacHex(payload);
  if (sig.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return false;
  const exp = Number(payload.split(":")[1]);
  return Number.isFinite(exp) && Date.now() < exp;
}

export function sessionCookieOptions(req?: Request) {
  const forwarded = req?.headers.get("x-forwarded-proto");
  const https =
    forwarded === "https" ||
    Boolean(req?.url.startsWith("https://")) ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: https,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
}
