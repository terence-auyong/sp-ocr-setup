import { OcrTemplateData } from "@/types/OcrTemplate";
import { createContext, ReactNode, useContext, useState } from "react";

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