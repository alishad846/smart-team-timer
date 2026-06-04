import { NextRequest } from "next/server";

function readTrackerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return request.headers.get("x-tracker-secret")?.trim() ?? "";
}

export function getTrackerSecret() {
  return (
    process.env.TRACKER_SHARED_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function isTrackerRequest(request: NextRequest) {
  const expected = getTrackerSecret();
  const provided = readTrackerToken(request);

  return Boolean(expected && provided && expected === provided);
}
