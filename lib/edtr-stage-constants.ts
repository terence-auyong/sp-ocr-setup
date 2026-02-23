/** Cookie name for the selected EDTR stage (dev | qa | uat | prod). */
export const STAGE_COOKIE_NAME = "edtr-stage";

export const EDTR_STAGES = ["dev", "qa", "uat", "prod"] as const;
export type EdtrStage = (typeof EDTR_STAGES)[number];

export const STAGE_LABELS: Record<EdtrStage, string> = {
  dev: "Development",
  qa: "QA",
  uat: "UAT",
  prod: "Production",
};
