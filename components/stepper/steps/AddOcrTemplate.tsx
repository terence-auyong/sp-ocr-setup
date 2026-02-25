import { useOcrTemplate } from "@/contexts/OcrTemplateContexts";
import { fetchAppModule } from "@/services/app-module";
import { fetchAppOcrApi } from "@/services/app-ocr-api"
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const AddOcrTemplate = ({ setCurrentStep, stepsLength }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();
    const [showCodeError, setShowCodeError] = useState(false);
    const [showNameError, setShowNameError] = useState(false);
    const [showOcrApiError, setShowOcrApiError] = useState(false);
    const [showModuleCodeError, setShowModuleCodeError] = useState(false);

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

    const handleModuleChange = (id: string) => {
        if (id === "") {
            updateFormData({ module: null });

        } else {
            setShowModuleCodeError(false);
            const selectedMod = appModule.find(mod => mod.id === Number(id));
            updateFormData({ module: selectedMod || null });
        }
    };

    const handleNext = () => {
        let hasError = false;

        setShowCodeError(false);
        setShowNameError(false);
        setShowOcrApiError(false);
        setShowModuleCodeError(false);

        if (!formData.ocrCode) {
            setShowCodeError(true);
            hasError = true;
        }

        if (!formData.name) {
            setShowNameError(true);
            hasError = true;
        }

        if (!formData.ocrApi?.id) {
            setShowOcrApiError(true);
            hasError = true;
        }

        if (!formData.module?.id) {
            setShowModuleCodeError(true);
            hasError = true;
        }

        if (hasError) return;

        setCurrentStep((s) => Math.min(s + 1, stepsLength!));
    };

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full w-full rounded">
        <div className="w-120 font-bold">
            <p className="text-xl">Add OCR Templates</p>
        </div>
        <div className="flex flex-col gap-8 w-120 border-t border-b border-gray-300 pb-8 pt-8">
            <div className="flex justify-between">
                <p className="text-lg">Code</p>
                <div className="flex flex-col">
                    <select
                        className="p-2 w-64 bg-gray-200 rounded"
                        onChange={(e) => {
                            setShowCodeError(false);
                            updateFormData({ocrCode: e.target.value});
                        }}
                        value={formData.ocrCode ?? ""}
                    >
                        <option value="">Select</option>
                        <option value="NESTLE_TEMPLATE">NESTLE_TEMPLATE</option>
                        <option value="GENERIC_TEMPLATE">GENERIC_TEMPLATE</option>
                        <option value="GENERIC_MULTIPLE_TEMPLATE">GENERIC_MULTIPLE_TEMPLATE</option>
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
                <p className="text-lg">Name</p>
                <div className="flex flex-col">
                    <input 
                        type="text" 
                        className="p-2 w-64 bg-gray-200 rounded"
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
                <p className="text-lg">Description</p>
                <textarea 
                    className="p-2 w-64 min-h-32 bg-gray-200 rounded"
                    maxLength={65535}
                    value={ formData.description ?? "" }
                    onChange={(e) => updateFormData({description: e.target.value})}
                />
            </div>
            <div className="flex justify-between">
                <p className="text-lg">OCR API</p>
                <div className="flex flex-col">
                    <select
                        className="p-2 w-64 bg-gray-200 rounded"
                        onChange={(e) => {
                            setShowOcrApiError(false);
                            handleOcrApiChange(e.target.value);
                        }}
                        value={formData.ocrApi?.id ?? ""}
                    >
                        <option value="">Select</option>
                        {appOcrApi.map((api) => (
                            <option key={api.id} value={api.id}>
                                {api.name}
                            </option>
                        ))}
                    </select>
                    {showOcrApiError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                OCR API is required
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between">
                <p className="text-lg">Module Code</p>
                <div className="flex flex-col">
                    <select 
                        className="p-2 w-64 bg-gray-200 rounded"
                        onChange={(e) => handleModuleChange(e.target.value)}
                        value={formData.module?.id ?? ""}
                    >
                        <option value="">Select</option>
                        {appModule.map((api) => (
                            <option key={api.id} value={api.id}>
                                {api.name}
                            </option>
                        ))}
                    </select>
                    {showModuleCodeError && (
                        <div className="flex justify-end mt-1">
                            <span className="text-sm text-red-500">
                                Module Code is required
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