import mysql from "mysql2/promise";
import { getCredentialsForStage } from "./load-db-credentials";
import { getStageFromRequest, type EdtrStage } from "./stage";
import { getSchemaNameFromRequest } from "./auth";
import type { NextRequest } from "next/server";

const globalForDb = global as unknown as {
  pools: Record<string, mysql.Pool>;
};
if (!globalForDb.pools) globalForDb.pools = {};

function poolKey(stage: EdtrStage, schemaName: string | null): string {
  return schemaName ? `${stage}:${schemaName}` : `${stage}:default`;
}

/**
 * Returns the DB pool for this request. Stage from cookie "edtr-stage";
 * when the auth token has schema_name, credentials are resolved from the
 * Parameter Store array (JSON array at /edtr/{stage}/db-credentials) by
 * matching schema_name to an entry's schema_names. Use in API routes:
 * const pool = await getPool(req);
 */
// export async function getPool(req: NextRequest): Promise<mysql.Pool> {
//   const stage = getStageFromRequest(req);
//   const schemaName = await getSchemaNameFromRequest(req);
//   const key = poolKey(stage, schemaName);

//   if (globalForDb.pools[key]) return globalForDb.pools[key];

//   const creds = await getCredentialsForStage(stage, schemaName);
//   const pool = mysql.createPool({
//     host: creds.host,
//     user: creds.user,
//     password: creds.password,
//     database: creds.database,
//   });
//   globalForDb.pools[key] = pool;
//   return pool;
// }

export async function getPool(req: NextRequest): Promise<mysql.Pool> {
  const stage = getStageFromRequest(req);
  const schemaName = await getSchemaNameFromRequest(req);
  const key = poolKey(stage, schemaName);

  if (globalForDb.pools[key]) return globalForDb.pools[key];

  let pool;

  if (process.env.DB_HOST) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  } else {
    const creds = await getCredentialsForStage(stage, schemaName);
    pool = mysql.createPool({
      host: creds.host,
      user: creds.user,
      password: creds.password,
      database: creds.database,
      waitForConnections: true,
    });
  }

  globalForDb.pools[key] = pool;
  return pool;
}

/**
 * Closes and removes the DB pool for the given stage and schema_name.
 * Call this on logout so the next login gets a fresh connection.
 */
export async function closePoolForUser(
  stage: EdtrStage,
  schemaName: string | null
): Promise<void> {
  const key = poolKey(stage, schemaName);
  const pool = globalForDb.pools[key];
  if (pool) {
    await pool.end();
    delete globalForDb.pools[key];
  }
}
