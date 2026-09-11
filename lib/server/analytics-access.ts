import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "olympus-analytics-session";
export const SESSION_SECONDS = 4 * 60 * 60;

export function ownerPassword(): string | null {
  const password = process.env.OLYMPUS_OWNER_PASSWORD;
  return password && password.length >= 20 && password.length <= 256 ? password : null;
}
export function passwordsMatch(provided: string, expected: string): boolean {
  return timingSafeEqual(createHash("sha256").update(provided).digest(), createHash("sha256").update(expected).digest());
}
function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`olympus-analytics:${payload}`).digest("hex");
}
export function createSession(secret: string, now = Date.now()): string {
  const payload = `${now + SESSION_SECONDS * 1000}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${signature(payload, secret)}`;
}
export function validSession(value: string, secret: string, now = Date.now()): boolean {
  const match = /^(\d{13})\.([a-f0-9]{48})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires <= now || expires > now + SESSION_SECONDS * 1000) return false;
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(signature(`${match[1]}.${match[2]}`, secret), "hex"));
}
export function isOwner(request: Request): boolean {
  const secret = ownerPassword();
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  return !!secret && !!cookie && validSession(cookie.slice(SESSION_COOKIE.length + 1), secret);
}
export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function sessionCookie(value: string, request: Request, clear = false): string {
  const secure = process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${value}; Path=/api/vercel-analytics; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}
export function privateJson(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", ...extraHeaders } });
}
