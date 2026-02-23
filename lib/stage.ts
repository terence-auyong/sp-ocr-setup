import { NextRequest } from "next/server";
import {
  STAGE_COOKIE_NAME,
  EDTR_STAGES,
  type EdtrStage,
} from "./edtr-stage-constants";

export { STAGE_COOKIE_NAME, EDTR_STAGES, type EdtrStage };

export function isEdtrStage(s: string): s is EdtrStage {
  return EDTR_STAGES.includes(s as EdtrStage);
}

/**
 * Parameter Store path for DB credentials for the given stage.
 * e.g. getDbCredentialsPath("dev") => "/edtr/dev/db-credentials"
 */
export function getDbCredentialsPath(stage: EdtrStage): string {
  return `/edtr/${stage}/db-credentials`;
}

const DEFAULT_STAGE: EdtrStage = "dev";

/**
 * Reads the stage from the request (cookie or env). Defaults to "dev".
 */
export function getStageFromRequest(req: NextRequest): EdtrStage {
  const cookie = req.cookies.get(STAGE_COOKIE_NAME)?.value;
  if (cookie && isEdtrStage(cookie)) return cookie;
  const env = process.env.EDTR_STAGE;
  if (env && isEdtrStage(env)) return env;
  return DEFAULT_STAGE;
}
