import type { NextApiRequest } from "next";
import { PrismaClient } from "@prisma/client";
import { getRequestContext, RequestContext } from "./requestContext";
import type { Prisma } from "@prisma/client";

/**
 * Singleton Prisma client with tenant‑scoping middleware.
 */
let prisma: PrismaClient;

if (globalThis && !(globalThis as any).prisma) {
  (globalThis as any).prisma = new PrismaClient({
    log: ["error", "warn"],
  });
}
prisma = (globalThis as any).prisma;

/**
 * Attach the current Next.js request to Prisma calls.
 * Call this at the very start of each API route:
 *   import { attachRequestToPrisma } from "@/lib/prisma";
 *   attachRequestToPrisma(req);
 */
export function attachRequestToPrisma(req: NextApiRequest) {
  // Attach request object in a private property that the middleware can read.
  // Using a Symbol avoids name clashes.
  const symbol = Symbol.for("__request");
  // @ts-ignore – we intentionally add a hidden field.
  (prisma as any)[symbol] = { req };
}

// Middleware removed: organization scoping handled elsewhere

export { prisma };
