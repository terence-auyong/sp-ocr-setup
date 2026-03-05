import { useOcrTemplate } from '@/contexts/OcrTemplateContexts';
import { useState } from 'react'
import PreviewOcrTemplate from '../../PreviewOcrTemlate';

const SetStoreUsageLimits = ({ setCurrentStep }: OcrTemplateStepsProps) => {
    const { formData, updateFormData } = useOcrTemplate();
    const [showError, setShowError] = useState(false);
    const [previewChanges, setPreviewChanges] = useState(false);

    const isLimitValid =
        formData.limit !== undefined &&
        formData.limit !== "" &&
        !isNaN(Number(formData.limit)) &&
        Number(formData.limit) > 0;

    const handleInputLimit = (raw: string) => {
        if (raw === "") {
            updateFormData({ limit: "" });
            return;
        }

        const value = Number(raw);

        if (value >= 1 && value <= 100) {
            updateFormData({ limit: raw });
        }
    }

    const handleNext = () => {
        if (!isLimitValid) {
            setShowError(true);
            return;
        }
        setShowError(false);
        setPreviewChanges(true);
    };

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-208 w-full rounded">
        {previewChanges && <PreviewOcrTemplate onClose={() => setPreviewChanges(false)} setCurrentStep={setCurrentStep}/>}
        <div className="w-120 font-bold">
            <p className="text-xl">Set Store Usage Limits</p>
        </div>
        <div className="flex flex-col gap-8 w-120 border-t border-b border-gray-300 pb-8 pt-8">
            <div className="flex justify-between">
                <p className="text-lg">OCR Code</p>
                <input 
                    type="text" 
                    className="p-2 w-64 bg-gray-200 rounded"
                    value={ formData.ocrCode }
                    readOnly
                />
            </div>
            <div className="flex justify-between">
                <p className="text-lg">Name</p>
                <input 
                    type="text" 
                    className="p-2 w-64 bg-gray-200 rounded"
                    value={ formData.name }
                    readOnly
                />
            </div>
            <div className="flex justify-between">
                <p className="text-lg">Site group</p>
                <input 
                    type="text" 
                    className="p-2 w-64 bg-gray-200 rounded"
                    value={ formData.channel?.name || "N/A" }
                    readOnly
                />
            </div>
            <div className="flex justify-between">
                <p className="text-lg">Store</p>
                <input 
                    type="text" 
                    className="p-2 w-64 bg-gray-200 rounded"
                    value={ formData.store?.name || "N/A" }
                    readOnly
                />
            </div>
        </div>
        <div className="flex justify-between w-120 mt-4">
            <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
            >
                Previous
            </button>
            <button
                className="px-4 py-2 bg-blue-300 rounded hover:bg-blue-400 text-white font-bold"
                onClick={handleNext}
            >
                Preview Changes
            </button>
        </div>
    </div>
  )
}

export default SetStoreUsageLimits;