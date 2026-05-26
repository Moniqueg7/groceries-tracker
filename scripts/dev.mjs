/**
 * Start Next.js with the OS certificate store (fixes Checkers HTTPS on some Windows setups).
 * @see https://nodejs.org/api/cli.html#--use-system-ca
 */
import { execSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nodeFlags = ["--use-system-ca"];

if (!process.env.NODE_OPTIONS?.includes("use-system-ca")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
}

execSync("node scripts/sync-prisma-provider.mjs", { cwd: root, stdio: "inherit", env: process.env });

const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [...nodeFlags, nextBin, "dev", "--hostname", "0.0.0.0"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
