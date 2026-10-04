import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "./migrate";
import { bootstrap } from "./bootstrap";

export type DB = Database.Database;
export type Stmt = Database.Statement;

const g = globalThis as unknown as { __altaDb?: DB; __altaStmts?: Map<string, Stmt> };

export const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/alta.db";
// `next build` renders a few pages ahead of time. That must never create or touch the real database file.
const BUILDING = process.env.NEXT_PHASE === "phase-production-build";

function open(): DB {
  const file = BUILDING ? ":memory:" : DATABASE_PATH;
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const d = new Database(file);
  // Tuned for a small server: WAL lets reads continue during writes, NORMAL sync is safe with WAL,
  // and a small page cache keeps memory use low (8 MB).
  d.pragma("journal_mode = WAL");
  d.pragma("synchronous = NORMAL");
  d.pragma("foreign_keys = ON");
  d.pragma("busy_timeout = 5000");
  d.pragma("cache_size = -8000");
  d.pragma("temp_store = MEMORY");
  d.pragma("wal_autocheckpoint = 1000");
  migrate(d);
  bootstrap(d);
  return d;
}

/** One shared connection per server process, opened on first use. */
export function db(): DB {
  return (g.__altaDb ??= open());
}

/** Prepared statements are compiled once and reused: cheaper on CPU than re-parsing SQL on every request. */
export function q(sql: string): Stmt {
  const cache = (g.__altaStmts ??= new Map());
  let s = cache.get(sql);
  if (!s) { s = db().prepare(sql); cache.set(sql, s); }
  return s;
}

/** Runs `fn` as one atomic unit: everything commits together or nothing does. */
export function tx<T>(fn: () => T): T {
  return db().transaction(fn)();
}
