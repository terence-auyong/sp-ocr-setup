import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import { fetchAppModuleExtended } from '@/services/app-module-extended';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react'

const ModuleCode = ({ setCurrentStep, stepsLength }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();
    const [showModuleCodeError, setShowModuleCodeError] = useState(false);

    const { 
        data: AppModuleExtended = [], 
        isLoading: isModuleLoading } 
    = useQuery<AppModule[]>({
        queryKey: ['appModuleExtended'],
        queryFn: fetchAppModuleExtended,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const handleModuleToggle = (module: AppModule) => {
        const isSelected = formData.moduleExtended?.some(m => m.id === module.id);
        
        if (isSelected) {
            updateFormData({
                moduleExtended: formData.moduleExtended?.filter(m => m.id !== module.id)
            });
        } else {
            updateFormData({
                moduleExtended: [...formData.moduleExtended, module]
            });
        }
    };

    const filteredModules = useMemo(() => {
        if (!formData.module) return AppModuleExtended;

        const isInventoryModule = formData.module.code.toLowerCase() === 'inventory' || 
                                   formData.module.name.toLowerCase() === 'inventory';

        if (isInventoryModule) {
            return AppModuleExtended.filter(m => 
                m.code.toLowerCase() === 'inventory' || 
                m.name.toLowerCase() === 'inventory'
            );
        }

        return AppModuleExtended;
    }, [formData.module, AppModuleExtended]);

    const handleNext = () => {
        let hasError = false;

        setShowModuleCodeError(false);

        if (!formData.moduleExtended || formData.moduleExtended.length === 0) {
            setShowModuleCodeError(true);
            hasError = true;
        }

        if (hasError) return;

        setCurrentStep((s) => Math.min(s + 1, stepsLength!));
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 h-208 w-full rounded">
            <div className="w-120 font-bold">
                <p className="text-xl">Map Templates to Application Modules</p>
            </div>
            <div className="flex flex-col gap-8 w-120 border-t border-b border-gray-300 pb-8 pt-8">
                <div className="flex justify-between">
                    <p className="text-lg">OCR Code</p>
                    <input 
                        type="text" 
                        className="p-2 w-64 bg-gray-100 rounded"
                        readOnly
                        value={ formData.ocrCode }
                    />
                </div>
                <div className="flex justify-between">
                    <p className="text-lg">Name</p>
                    <input 
                        type="text" 
                        className="p-2 w-64 bg-gray-100 rounded"
                        readOnly
                        value={ formData.name }
                    />
                </div>
                <div className="flex justify-between items-start">
                    <p className="text-lg">
                        Module Code
                        <span className="text-red-500">*</span>
                    </p>
                    <div className="flex flex-col">
                        <div className="w-64 bg-gray-100 rounded p-2 max-h-48 overflow-y-auto">
                            {isModuleLoading ? (
                                <p className="text-sm text-gray-500">Loading...</p>
                            ) : filteredModules.length === 0 ? (
                                <p className="text-sm text-gray-500">No modules available</p>
                            ) : (
                                filteredModules.map((api) => (
                                    <label 
                                        key={api.id} 
                                        className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-300 px-1 rounded"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.moduleExtended?.some(m => m.id === api.id) ?? false}
                                            onChange={() => handleModuleToggle(api)}
                                            className="cursor-pointer"
                                        />
                                        <span className="text-sm">{api.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
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
            <div className="flex justify-between w-120 mt-4">
                <button
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
                >
                    Previous
                </button>
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

export default ModuleCode