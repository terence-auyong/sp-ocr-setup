import {
  SSMClient,
  GetParameterCommand,
  GetParametersByPathCommand,
} from "@aws-sdk/client-ssm";
import { getDbCredentialsPath, type EdtrStage } from "./stage";

const DEFAULT_REGION = "ap-southeast-1";

/** One entry from the db-credentials JSON array in Parameter Store */
export interface DbCredentialEntry {
  schema_names: string[];
  hostname: string;
  hostname_report?: string;
  username: string;
  password: string;
}

/**
 * Fetches parameters from AWS Systems Manager Parameter Store using the default
 * credential chain (e.g. ~/.aws/credentials, environment variables, IAM role).
 */
export async function getParametersByPath(
  path: string,
  region: string = DEFAULT_REGION
): Promise<Record<string, string>> {
  const client = new SSMClient({ region });
  const params: Record<string, string> = {};
  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      })
    );

    for (const p of response.Parameters ?? []) {
      if (p.Name && p.Value !== undefined) {
        const key = p.Name.replace(path.endsWith("/") ? path : `${path}/`, "");
        if (key) params[key] = p.Value;
      }
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return params;
}

/**
 * Fetches a single parameter by name (e.g. for a JSON blob at the path).
 */
export async function getParameter(
  name: string,
  region: string = DEFAULT_REGION
): Promise<string> {
  const client = new SSMClient({ region });
  const response = await client.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    })
  );
  const value = response.Parameter?.Value;
  if (value === undefined) {
    throw new Error(`Parameter not found: ${name}`);
  }
  return value;
}

/**
 * Fetches the raw parameter value at the path (single parameter, not by path).
 * Used when the value is a JSON array of credential entries.
 */
export async function getDbCredentialsListFromParamStore(
  path: string,
  region: string = DEFAULT_REGION
): Promise<DbCredentialEntry[]> {
  const raw = await getParameter(path, region);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Parameter at "${path}" is not a JSON array of credential entries.`
    );
  }
  return parsed as DbCredentialEntry[];
}

/**
 * Resolves DB credentials for a given schema_name from the Parameter Store array.
 * The parameter value must be a JSON array of { schema_names, hostname, username, password }.
 */
export async function getDbCredentialsForSchemaFromParamStore(
  path: string,
  schemaName: string,
  region: string = DEFAULT_REGION
): Promise<{
  host: string;
  user: string;
  password: string;
  database: string;
}> {
  const list = await getDbCredentialsListFromParamStore(path, region);
  const entry = list.find((e) =>
    e.schema_names.some(
      (s) => s.toLowerCase() === schemaName.toLowerCase()
    )
  );
  if (!entry) {
    throw new Error(
      `No DB credentials found for schema_name "${schemaName}" at path "${path}". ` +
        `Available schema_names: ${list.flatMap((e) => e.schema_names).join(", ") || "none"}.`
    );
  }
  return {
    host: entry.hostname,
    user: entry.username,
    password: entry.password,
    database: schemaName,
  };
}

/**
 * Loads DB credentials from Parameter Store. Supports:
 * 1. JSON array of { schema_names, hostname, username, password } – use getDbCredentialsForSchemaFromParamStore for lookup by schema_name
 * 2. Multiple parameters under the path (e.g. /edtr/dev/db-credentials/DB_HOST, ...)
 * 3. Single parameter at the path whose value is JSON object with host, user, password, database
 */
export async function getDbCredentialsFromParamStore(
  path: string,
  region: string = DEFAULT_REGION
): Promise<{ host?: string; user?: string; password?: string; database?: string }> {
  const byPath = await getParametersByPath(path, region);

  if (Object.keys(byPath).length > 0) {
    return {
      host: byPath.DB_HOST ?? byPath.host,
      user: byPath.DB_USER ?? byPath.user,
      password: byPath.DB_PASSWORD ?? byPath.password,
      database: byPath.DB_NAME ?? byPath.database,
    };
  }

  try {
    const raw = await getParameter(path, region);
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      throw new Error(
        `Parameter at "${path}" is a JSON array; provide schema_name and use getDbCredentialsForSchemaFromParamStore.`
      );
    }

    const obj = parsed as Record<string, string>;
    return {
      host: obj.DB_HOST ?? obj.host,
      user: obj.DB_USER ?? obj.user,
      password: obj.DB_PASSWORD ?? obj.password,
      database: obj.DB_NAME ?? obj.database,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("JSON array")) throw err;
    throw new Error(
      `No DB credentials found at path "${path}" (no parameters by path and no single JSON object).`
    );
  }
}
