import {
  getDbCredentialsFromParamStore,
  getDbCredentialsForSchemaFromParamStore,
} from "./aws-params";
import { getDbCredentialsPath, type EdtrStage } from "./stage";

export type DbCreds = {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
};

const credentialsCache = new Map<string, DbCreds>();

function cacheKey(stage: EdtrStage, schemaName: string | null): string {
  return schemaName ? `${stage}:${schemaName}` : `${stage}:default`;
}

/**
 * Returns DB credentials for the given stage (and optional schema_name from token).
 * - When schemaName is provided: Parameter Store value at /edtr/{stage}/db-credentials
 *   must be a JSON array of { schema_names, hostname, username, password }; the entry
 *   whose schema_names includes schemaName is used, and database = schemaName.
 * - When schemaName is not provided: uses single-credential format (by-path params or
 *   single JSON object), or for dev with process.env.DB_* set, uses env.
 * Cached per (stage, schemaName).
 */
export async function getCredentialsForStage(
  stage: EdtrStage,
  schemaName: string | null = null
): Promise<DbCreds> {
  const key = cacheKey(stage, schemaName);
  const cached = credentialsCache.get(key);
  if (cached) return cached;

  if (schemaName) {
    const path = getDbCredentialsPath(stage);
    const creds = await getDbCredentialsForSchemaFromParamStore(
      path,
      schemaName
    );
    credentialsCache.set(key, creds);
    return creds;
  }

  if (stage === "dev" && process.env.DB_HOST) {
    const fromEnv: DbCreds = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
    credentialsCache.set(key, fromEnv);
    return fromEnv;
  }

  const path = getDbCredentialsPath(stage);
  const creds = await getDbCredentialsFromParamStore(path);
  credentialsCache.set(key, creds);
  return creds;
}
