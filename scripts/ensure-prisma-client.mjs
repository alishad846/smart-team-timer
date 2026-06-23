import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

const clientFiles = [
  "node_modules/.prisma/client/index.js",
  "node_modules/.prisma/client/package.json"
];

async function prismaClientExists() {
  try {
    await Promise.all(clientFiles.map((file) => access(file)));
    return true;
  } catch {
    return false;
  }
}

async function run() {
  if (await prismaClientExists()) {
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn("npx", ["prisma", "generate"], {
      stdio: "inherit",
      shell: true
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`prisma generate failed with exit code ${code ?? "unknown"}`));
    });
  });
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
