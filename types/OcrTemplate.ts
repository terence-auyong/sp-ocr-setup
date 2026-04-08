export type OcrTemplateStepsProps = {
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    currentStep?: number;
    stepsLength?: number;
}

export type AppOcrApi = { 
    id: number; 
    code: string; 
    name: string; 
}
export type AppModule = { 
    id: number; 
    code: string; 
    name: string; 
}

export type AppModuleExtended = { 
    id: number; 
    code: string; 
    name: string; 
}

export type AppStore = {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
}

export type AppChannel = {
    id: number;
    code: string;
    name: string;
}

export type AppRegion = {
    id: number;
    code: string;
    name: string;
}

export type AppStoreChannel = {
    id: number;
    code: string;
    name: string;
}

export type AppStoreGroup = {
    id: number;
    code: string;
    name: string;
}

export type AppStoreType = {
    id: number;
    code: string;
    name: string;
}


export type SelectionType = 'siteGroup' | 'store';

export type BatchGroup = {
    siteGroup: AppChannel;
    stores: AppStore[];
}

export type BatchEntry = {
    id: string;
    maxScan: string;
    groups: BatchGroup[];
}

export type OcrTemplateData = {
    ocrCode: string;
    name: string;
    description: string;
    ocrApi: AppOcrApi | null;
    module: AppModule | null;
    moduleExtended: AppModuleExtended[];
    usageLimits: {
        maxUsage: number;
        period: string;
    };
    batchSelectionType: SelectionType;
    batches: BatchEntry[];
};