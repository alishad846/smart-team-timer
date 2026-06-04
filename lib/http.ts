import { NextResponse } from "next/server";

export function jsonWithCookies<T>(
  source: NextResponse,
  body: T,
  init?: ResponseInit
) {
  const response = NextResponse.json(body, init);
  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}
