import { OcrTemplateData } from "@/types/ocrTemplate";

export const fetchOcrSetup = async (formData: OcrTemplateData) => {
  const payload = {
    ocrCode: formData.ocrCode,
    ocrName: formData.name,
    description: formData.description,
    ocrApi: formData.ocrApi,
    moduleCode: formData.module,
    extendedModuleCodes: formData.moduleExtended,
    batches: formData.batches,
  };

  const res = await fetch("/api/ocr-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Failed to fetch configuration per inventory areas.");
  }

  return res.json();
};