"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type AppOcrApi = { id: number; code: string; name: string; }
export type AppModule = { id: number; code: string; name: string; }
export type AppModuleExtended = { id: number; code: string; name: string; }

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

export type SelectionType = 'siteGroup' | 'store';

// One batch = one "Add" action.
// Holds multiple site groups, each with their matched stores, and a shared maxScan.
export type BatchGroup = {
    siteGroup: AppChannel;
    stores: AppStore[]; // only stores whose channel_id === siteGroup.id
}

export type BatchEntry = {
    id: string;
    maxScan: string;
    groups: BatchGroup[]; // one group per selected site group
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

// ─── Context ──────────────────────────────────────────────────────────────────

type OcrTemplateContextType = {
    formData: OcrTemplateData;
    updateFormData: (data: Partial<OcrTemplateData>) => void;
    resetFormData: () => void;
};

const initialFormData: OcrTemplateData = {
    ocrCode: "",
    name: "",
    description: "",
    ocrApi: null,
    module: null,
    moduleExtended: [],
    usageLimits: {
        maxUsage: 0,
        period: 'daily',
    },
    batchSelectionType: 'siteGroup',
    batches: [],
};

const OcrTemplateContext = createContext<OcrTemplateContextType | undefined>(undefined);

export function OcrTemplateProvider({ children }: { children: ReactNode }) {
    const [formData, setFormData] = useState<OcrTemplateData>(initialFormData);

    const updateFormData = (data: Partial<OcrTemplateData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const resetFormData = () => {
        setFormData(initialFormData);
    };

    return (
        <OcrTemplateContext.Provider value={{ formData, updateFormData, resetFormData }}>
            {children}
        </OcrTemplateContext.Provider>
    );
}

export function useOcrTemplate() {
    const context = useContext(OcrTemplateContext);
    if (!context) {
        throw new Error('useOcrTemplate must be used within OcrTemplateProvider');
    }
    return context;
}