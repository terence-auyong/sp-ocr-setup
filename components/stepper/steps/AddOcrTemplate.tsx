import { useOcrTemplate } from "@/contexts/OcrTemplateContexts";
import { fetchAppModule } from "@/services/app-module";
import { fetchAppOcrApi } from "@/services/app-ocr-api"
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const AddOcrTemplate = ({ setCurrentStep, stepsLength }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();
    const [showCodeError, setShowCodeError] = useState(false);
    const [showNameError, setShowNameError] = useState(false);
    const [showDescError, setShowDescError] = useState(false);
    const [showOcrApiError, setShowOcrApiError] = useState(false);

    const { data: appOcrApi = [], isLoading: IsOcrApiLoading } = useQuery<AppOcrApi[]>({
        queryKey: ['appOcrApi'],
        queryFn: fetchAppOcrApi,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appModule = [], isLoading: isModuleLoading } = useQuery<AppModule[]>({
        queryKey: ['appModule'],
        queryFn: fetchAppModule,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const handleOcrApiChange = (id: string) => {
        if (id === "") {
            updateFormData({ ocrApi: null });
        } else {
            const selectedApi = appOcrApi.find(api => api.id === Number(id));
            updateFormData({ ocrApi: selectedApi || null });
        }
    };

    const handleNext = () => {
        let hasError = false;

        setShowCodeError(false);
        setShowNameError(false);
        setShowDescError(false);
        setShowOcrApiError(false);

        if (!formData.ocrCode) {
            setShowCodeError(true);
            hasError = true;
        }

        if (!formData.name) {
            setShowNameError(true);
            hasError = true;
        }

        if (!formData.description) {
            setShowDescError(true);
            hasError = true;
        }

        if (!formData.ocrApi?.id) {
            setShowOcrApiError(true);
            hasError = true;
        }

        if (hasError) return;

        setCurrentStep((s) => Math.min(s + 1, stepsLength!));
    };

    useEffect(() => {
        if (appModule.length === 0) return;

        let targetName = "";
        if (formData.ocrCode === "OCR Inside INV") {
            targetName = "Inventory";
        } else if (formData.ocrCode === "Multiple OCR Module") {
            targetName = "OCR";
        }

        const selectedModule = appModule.find(mod => mod.name === targetName);
        
        if (selectedModule && formData.module?.id !== selectedModule.id) {
            updateFormData({ module: selectedModule });
        }
    }, [formData.ocrCode, appModule, updateFormData]);

    useEffect(() => {
        if (appOcrApi.length > 0 && !formData.ocrApi) {
            const defaultApi = appOcrApi.find(api => api.name === "Analyze Document");
            
            if (defaultApi) {
                updateFormData({ ocrApi: defaultApi });
            }
        }
    }, [appOcrApi, formData.ocrApi, updateFormData]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full w-full rounded">
        <div className="w-120 font-bold">
            <p className="text-xl">Add OCR Templates</p>
        </div>
        <div className="flex flex-col gap-8 w-120 border-t border-b border-gray-300 pb-8 pt-8">
            <div className="flex justify-between">
                <p className="text-lg">
                    Code
                    <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-col">
                    <select
                        className="p-2 w-64 bg-gray-100 rounded"
                        onChange={(e) => {
                            setShowCodeError(false);
                            updateFormData({ocrCode: e.target.value});
                        }}
                        value={formData.ocrCode ?? ""}
                    >
                        <option value="">Select</option>
                        <option value="OCR Inside INV">OCR Inside INV</option>
                        <option value="Multiple OCR Module">Multiple OCR Module</option>
                    </select>
                    {showCodeError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Code is required
                            </span>
                        </div>
                    )}
                </div> 
            </div>
            <div className="flex justify-between">
                <p className="text-lg">
                    Name
                    <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-col">
                    <input 
                        type="text" 
                        className="p-2 w-64 bg-gray-100 rounded"
                        maxLength={100}
                        value={ formData.name ?? "" }
                        onChange={(e) => {
                            setShowNameError(false);
                            updateFormData({name: e.target.value});
                        }}
                        
                    />
                    {showNameError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Name is required
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between">
                <p className="text-lg">
                    Description
                    <span className="text-red-500">*</span>
                </p>
                 <div className="flex flex-col">
                    <textarea 
                        className="p-2 w-64 min-h-32 max-h-64 bg-gray-100 rounded"
                        maxLength={65535}
                        value={ formData.description ?? "" }
                        onChange={(e) => updateFormData({description: e.target.value})}
                    />
                    {showDescError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Description is required
                            </span>
                        </div>
                    )}
                 </div>
            </div>
            <div className="flex justify-between">
                <p className="text-lg">
                    OCR API
                    <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-col">
                    {IsOcrApiLoading ? (
                        <div className="p-2 w-64 bg-gray-100 rounded">
                            Loading...
                        </div>
                    ): (
                        <select
                            className="p-2 w-64 bg-gray-100 rounded"
                            onChange={(e) => {
                                setShowOcrApiError(false);
                                handleOcrApiChange(e.target.value);
                            }}
                            value={formData.ocrApi?.id ?? ""}
                        >
                            {appOcrApi.map((api) => (
                                <option key={api.id} value={api.id}>
                                    {api.name}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {showOcrApiError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                OCR API is required
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="flex justify-end w-120 mt-4">
            <button
                className="px-4 py-2 bg-blue-300 rounded text-white font-bold"
                onClick={handleNext}
            >
                Next
            </button>
        </div>
    </div>
  )
}

export default AddOcrTemplate;