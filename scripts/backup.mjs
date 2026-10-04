// Safe online backup of the SQLite database. Works while the shop is running.
//   npm run db:backup                  -> data/backups/alta-<timestamp>.db  (keeps the newest 14)
//   BACKUP_DIR=/mnt/backups npm run db:backup
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const source = process.env.DATABASE_PATH ?? "./data/alta.db";
const dir = process.env.BACKUP_DIR ?? "./data/backups";
const keep = Number(process.env.BACKUP_KEEP ?? 14);

if (!existsSync(source)) { console.error(`No database at ${source}`); process.exit(1); }
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const target = join(dir, `alta-${stamp}.db`);
const db = new Database(source, { readonly: true });
await db.backup(target); // SQLite's online backup API: consistent even with writes in flight
db.close();
// Make the copy one self-contained file (no -wal/-shm companions), then verify it.
const check = new Database(target);
check.pragma("journal_mode = DELETE");
const ok = check.pragma("integrity_check", { simple: true });
check.close();
if (ok !== "ok") { console.error("Backup failed its integrity check:", ok); rmSync(target); process.exit(1); }
const old = readdirSync(dir).filter((f) => /^alta-.*\.db$/.test(f)).sort().reverse().slice(keep);
for (const f of old) rmSync(join(dir, f));
console.log(`Backed up to ${target} (integrity ok)${old.length ? `, removed ${old.length} old` : ""}`);
