import { useOcrTemplate } from '../contexts/OcrTemplateContexts';
import { useState } from 'react';
import generateOcrTemplateScript from '@/utils/generateOcrTemplateScript';
import { fetchOcrSetup } from '../services/ocr-setup';
import { LuCircleCheckBig } from "react-icons/lu";
import { BatchesPreviewTable } from './sitegroup-store/BatchesPreviewTable';

type PreviewChangesProps = {
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
    onClose: () => void;
};

const PreviewOcrTemplate = ({ onClose, setCurrentStep }: PreviewChangesProps) => {
    const { formData, resetFormData } = useOcrTemplate();
    const { moduleExtended, ocrCode, name, description, ocrApi, module, batches } = formData;

    const [showScripts, setShowScripts] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const script = generateOcrTemplateScript(formData);

    const handleSubmit = async () => {
        try {
            setLoadingSubmit(true);
            await fetchOcrSetup(formData);
            setLoadingSubmit(false);
            setShowSuccess(true);
        } catch (err) {
            console.error(err);
            setLoadingSubmit(false);
        }
    };

    const handleRedirect = () => {
        onClose();
        setCurrentStep(1);
        resetFormData();
        setShowSuccess(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 flex bg-[#FAFAFA] shadow-md rounded p-4 max-h-[90vh] overflow-y-auto">

                {loadingSubmit && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 rounded">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
                            <span className="text-white font-medium">Submitting...</span>
                        </div>
                    </div>
                )}

                {showSuccess && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 rounded">
                        <div className="bg-white rounded p-4 shadow-lg flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <LuCircleCheckBig size={40} color="green" />
                            </div>
                            <h3 className="text-lg font-semibold text-black">Executed Successfully!</h3>
                            <button className="button p-2 w-16 rounded text-white" onClick={handleRedirect}>
                                Close
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col mb-4">
                        <h2 className="text-lg font-bold">OCR Template Info</h2>
                        <button
                            className="text-blue-400 text-sm hover:underline self-start"
                            onClick={() => setShowScripts(prev => !prev)}
                        >
                            {showScripts ? "Hide Scripts" : "Show Scripts"}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <label className="font-medium">Code</label>
                        <input readOnly value={ocrCode || '-'} className="bg-gray-200 p-2 rounded w-64" />

                        <label className="font-medium">Name</label>
                        <input readOnly value={name || '-'} className="bg-gray-200 p-2 rounded w-64" />

                        <label className="font-medium">Description</label>
                        <textarea readOnly value={description || '-'} className="bg-gray-200 p-2 rounded w-64 h-32" />

                        <label className="font-medium">OCR API</label>
                        <input readOnly value={ocrApi?.name || '-'} className="bg-gray-200 p-2 rounded w-64" />

                        <label className="font-medium">Main Module</label>
                        <input readOnly value={module?.name || '-'} className="bg-gray-200 p-2 rounded w-64" />

                        <label className="font-medium">Extended Modules</label>
                        <input
                            readOnly
                            value={moduleExtended.length > 0 ? moduleExtended.map(m => m.name).join(', ') : '-'}
                            className="bg-gray-200 p-2 rounded w-64"
                        />

                        <label className="font-medium pt-1">Site Group / Store Batches</label>
                        <div className="w-64">
                            <BatchesPreviewTable rows={batches} />
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-2">
                        <button className="bg-gray-200 w-30 h-8 rounded hover:bg-gray-300" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="bg-blue-300 w-30 h-8 rounded button" onClick={handleSubmit}>
                            Execute
                        </button>
                    </div>
                </div>

                <div className={`bg-[#FAFAFA] transition-all duration-300 overflow-hidden ${showScripts ? "w-120 border-l border-gray-300 pl-4 ml-4" : "w-0 border-none"}`}>
                    <div className="relative h-full">
                        <textarea className="h-full w-full p-2 resize-none" value={script} readOnly />
                        {showScripts && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(script);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="absolute top-2 right-6 bg-blue-300 text-white text-sm px-2 py-1 rounded hover:bg-blue-400 transition"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewOcrTemplate;