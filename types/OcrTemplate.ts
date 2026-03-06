export type OcrTemplateStepsProps = {
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    currentStep?: number;
    stepsLength?: number;
}

// type AppOcrApi = {
//     id: number;
//     code: string;
//     name: string;
// }

// type AppModule = {
//     id: number;
//     code: string;
//     name: string;
// }

// type AppModuleExtended = {
//     id: number;
//     code: string;
//     name: string;
// }

// type AppStore = { 
//     id: number; 
//     store_code: string; 
//     name: string; 
//     channel_id: number;
// }

// type AppChannel = {
//     id: number; 
//     code: string; 
//     name: string; 
// }

// type OcrTemplateData = {
//     ocrCode: string;
//     name: string;
//     description: string;
//     ocrApi: AppOcrApi | null;
//     module: AppModule | null;
//     store: AppStore | null;
//     channel: AppChannel | null;
//     limit: string | number;
//     moduleExtended: AppModuleExtended[];
//     usageLimits: {
//         maxUsage: number;
//         period: string;
//     };
// };

export type BatchEntry = {
    id: string;
    maxScan: string;
    groups: {
        siteGroup: AppChannel;
        stores: AppStore[];
    }[];
}


export type AppOcrApi = { id: number; code: string; name: string; }
export type AppModule = { id: number; code: string; name: string; }
type AppModuleExtended = { id: number; code: string; name: string; }

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

// Each saved row = one site group + its own stores + its own max scan.
// Bulk-adding SM + Robinsons at once creates TWO independent SiteGroupRows.
export type SiteGroupRow = {
    id: string;           // uuid — used as React key and for edit/delete targeting
    siteGroup: AppChannel;
    stores: AppStore[];   // only stores whose channel_id === siteGroup.id
    maxScan: string;
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
    // Flat list of independent site group rows (replaces old store/channel/limit + BatchEntry[])
    batches: SiteGroupRow[];
    batchSelectionType: 'siteGroup' | 'store';
};