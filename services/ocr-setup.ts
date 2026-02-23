type AppOcrApi = {
    id: number;
    code: string;
    name: string;
}

type AppModule = {
    id: number;
    code: string;
    name: string;
}

type AppStore = {
    id: number;
    store_code: string;
    name: string;
}

type AppChannel = {
    id: number;
    code: string;
    name: string;
}

type AppModuleExtended = {
    id: number;
    code: string;
    name: string;
}

type OcrTemplateData = {
    ocrCode: string;
    name: string;
    description: string;
    ocrApi: AppOcrApi | null;
    module: AppModule | null;
    store: AppStore | null;
    channel: AppChannel | null;
    limit: string | number;
    moduleExtended: AppModuleExtended[];
    usageLimits: {
        maxUsage: number;
        period: string;
    };
};

export const fetchOcrSetup = async (formData: OcrTemplateData) => {
  const payload = {
    ocrCode: formData.ocrCode,
    ocrName: formData.name,
    description: formData.description,
    ocrApi: formData.ocrApi,
    moduleCode: formData.module,
    extendedModuleCodes: formData.moduleExtended,
    store: formData.store,
    channel: formData.channel,
    limit: formData.limit
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
