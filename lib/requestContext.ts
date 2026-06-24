import type { NextApiRequest } from "next";

/**
 * Minimal request‑context extractor.
 * Expects a JWT either in the `Authorization: Bearer <token>` header
 * or in a cookie named `token`. The JWT payload must contain:
 *   - sub   → user id
 *   - orgId → organization id
 *   - role  → user role (e.g. ADMIN, EMPLOYEE)
 *
 * In production replace the naive base64 decode with a proper verification
 * using your auth library (e.g. `jsonwebtoken.verify`).
 */
export interface RequestContext {
  userId: string;
  orgId: string;
  role: string;
}

export function getRequestContext(req: NextApiRequest): RequestContext | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) return null;

  try {
    // Naïve decode – split JWT and base64‑url decode payload
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf-8")
    );
    if (!payload.sub || !payload.orgId) return null;
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role ?? "EMPLOYEE",
    };
  } catch {
    return null;
  }
}
