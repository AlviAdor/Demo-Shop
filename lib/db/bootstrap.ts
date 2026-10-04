import { randomUUID } from "node:crypto";
import { hashPassword } from "../password";
import { seedCatalogue, seedDemo } from "./seed";
import type { DB } from "./index";

/** First-run setup. Safe to run on every start: each step only acts when its data is missing. */
export function bootstrap(d: DB) {
  if (!d.prepare("SELECT 1 FROM categories LIMIT 1").get()) seedCatalogue(d);

  // Demo accounts and sample orders: on by default in development, off in production unless asked for.
  const demo = process.env.SEED_DEMO_DATA ? process.env.SEED_DEMO_DATA === "1" : process.env.NODE_ENV !== "production";
  if (demo && !d.prepare("SELECT 1 FROM users LIMIT 1").get()) seedDemo(d);

  // A real deployment gets its first owner account from the environment.
  if (!d.prepare("SELECT 1 FROM users WHERE role = 'owner' LIMIT 1").get()) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
      d.prepare("INSERT INTO users (id, name, email, hash, role, created_at) VALUES (?, ?, ?, ?, 'owner', ?)")
        .run("u_" + randomUUID().slice(0, 8), process.env.ADMIN_NAME?.trim() || "Owner", email, hashPassword(password), Date.now());
      console.log(`Created the owner account for ${email}. Remove ADMIN_PASSWORD from the environment now.`);
    } else if (process.env.NODE_ENV === "production") {
      console.warn("No owner account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD once to create one.");
    }
  }
}
