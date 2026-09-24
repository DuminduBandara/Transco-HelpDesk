import mysql from "mysql2/promise";

// A single pool, shared across the whole app / all API routes.
// Next.js reuses the Node.js process across requests in dev and in
// most server deployments, but hot-reload in dev can re-run this
// module, so we stash the pool on `globalThis` to avoid opening a
// fresh pool (and leaking connections) on every reload.

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    dateStrings: true, // return DATETIME as 'YYYY-MM-DD HH:MM:SS' strings, not JS Date
  });
}

export const pool = globalThis._mysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis._mysqlPool = pool;
}

/**
 * Thin helper for SELECTs — returns rows typed as T[].
 */
export async function query<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

/**
 * Thin helper for INSERT/UPDATE/DELETE — returns the ResultSetHeader
 * (insertId, affectedRows, etc).
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}
