import { existsSync, mkdirSync, rmSync } from "node:fs";

const distPath = new URL("../dist", import.meta.url);

if (existsSync(distPath)) {
  rmSync(distPath, { recursive: true, force: true });
}

mkdirSync(distPath, { recursive: true });
console.log("Server build step completed.");
