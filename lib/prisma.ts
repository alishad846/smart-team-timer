import type { NextApiRequest } from "next";
import { prisma as prismaClient } from "@prisma/client";
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

/**
 * Prisma middleware that automatically injects `organizationId` into every query
 * based on the JWT payload extracted by `getRequestContext`.
 *
 * It works for all models that contain an `organizationId` column.
 * Models without that column (e.g., Organization) are ignored.
 */
prisma.$use(async (params, next) => {
  // Retrieve the request attached by `attachRequestToPrisma`.
  const symbol = Symbol.for("__request");
  const maybe = (prisma as any)[symbol];
  const req: NextApiRequest | undefined = maybe?.req;

  if (!req) return next(params);

  const ctx: RequestContext | null = getRequestContext(req);
  if (!ctx) return next(params);

  const modelsWithoutOrgId = new Set(["Organization"]);
  const model = params.model as string;

  if (!modelsWithoutOrgId.has(model)) {
    const readActions = ["findMany", "findFirst", "findUnique", "count", "aggregate"];
    const writeActions = ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"];

    if (readActions.includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      (params.args.where as any).organizationId = ctx.orgId;
    } else if (writeActions.includes(params.action)) {
      if (!params.args) params.args = {};
      // For create/upsert the payload lives under `data`.
      if (["create", "upsert"].includes(params.action)) {
        if (!params.args.data) params.args.data = {};
        (params.args.data as any).organizationId = ctx.orgId;
      } else {
        // For update/deleteMany etc.
        (params.args as any).organizationId = ctx.orgId;
      }
    }
  }

  return next(params);
});

export { prisma };
