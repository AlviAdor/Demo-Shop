// Runs each end-to-end suite against its own fresh server and temporary database, so suites can't interfere
// with each other (sign-up and checkout are rate limited on purpose). Requires a build first:  npm run build && npm test
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!existsSync(".next/BUILD_ID")) { console.error("No production build found. Run `npm run build` first."); process.exit(1); }

const suites = ["scripts/db.e2e.mjs", "scripts/payments.e2e.mjs"];
const freePort = () => new Promise((res) => { const s = createServer().listen(0, () => { const { port } = s.address(); s.close(() => res(port)); }); });
const secrets = { AUTH_SECRET: "test-auth-secret-0123456789-0123456789-0123456789", PAYMENT_WEBHOOK_SECRET: "test-webhook-secret-0123456789" };
const run = (cmd, args, env) => new Promise((res) => { const p = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } }); p.on("close", (code) => res(code ?? 1)); });

let failed = 0;
for (const suite of suites) {
  const dir = mkdtempSync(join(tmpdir(), "alta-test-"));
  const port = await freePort();
  const env = { ...secrets, PORT: String(port), DATABASE_PATH: join(dir, "test.db"), SEED_DEMO_DATA: "1", ALLOW_DEMO_PAYMENTS: "1", SITE_URL: "https://test.example", NODE_ENV: "production" };
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { env: { ...process.env, ...env }, stdio: "ignore" });
  const base = `http://localhost:${port}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { up = await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false); if (!up) await new Promise((r) => setTimeout(r, 500)); }
  if (!up) { console.error(`Server did not start for ${suite}`); server.kill(); failed++; continue; }
  console.log(`\n=== ${suite}`);
  const code = await run(process.execPath, [suite], { BASE_URL: base, PAYMENT_WEBHOOK_SECRET: secrets.PAYMENT_WEBHOOK_SECRET });
  if (code) failed++;
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} suite(s) FAILED` : "\nAll suites passed");
process.exit(failed ? 1 : 0);
