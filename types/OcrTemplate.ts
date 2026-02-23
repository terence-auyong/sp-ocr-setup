type OcrTemplateStepsProps = {
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    currentStep?: number;
    stepsLength?: number;
}

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

type AppModuleExtended = {
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