import { createSession, ownerPassword, passwordsMatch, privateJson, sameOrigin, sessionCookie } from "../../../../lib/server/analytics-access";

export const runtime = "nodejs";
// Per-instance guard supplements the long password; it is not a distributed rate limiter.
let failedAttempts = 0;
let windowEnds = 0;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Open the sign-in form from Olympus." }, 403);
  const password = ownerPassword();
  if (!password) return privateJson({ code: "owner_setup", error: "Set OLYMPUS_OWNER_PASSWORD to at least 20 characters, then restart Olympus." }, 503);
  if (Date.now() >= windowEnds) { failedAttempts = 0; windowEnds = Date.now() + 60_000; }
  if (failedAttempts >= 10) return privateJson({ error: "Too many attempts. Please wait one minute." }, 429, { "Retry-After": "60" });
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length") || 0) > 1024) return privateJson({ error: "Invalid sign-in request." }, 400);
  let provided: unknown;
  try {
    const text = await request.text();
    if (text.length > 1024) throw new Error();
    provided = JSON.parse(text)?.password;
  } catch { return privateJson({ error: "Invalid sign-in request." }, 400); }
  if (typeof provided !== "string" || provided.length > 256 || !passwordsMatch(provided, password)) {
    failedAttempts += 1;
    return privateJson({ error: "That owner password is incorrect." }, 401);
  }
  failedAttempts = 0;
  return privateJson({ ok: true }, 200, { "Set-Cookie": sessionCookie(createSession(password), request) });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Open Olympus to lock analytics." }, 403);
  return privateJson({ ok: true }, 200, { "Set-Cookie": sessionCookie("", request, true) });
}
