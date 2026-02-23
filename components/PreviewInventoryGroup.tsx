import { useState, Fragment } from 'react';
import { LuCircleCheckBig } from "react-icons/lu";
import { generateInvScript } from '@/utils/scripts';
import { submitInventoryOcr } from '@/services/inventory-ocr';

type PreviewChangesProps = {
    areaData: AreaDataState, 
    inventoryGroupCode: string,
    onClose: () => void; 
    clearArea: () => void;
    onSubmitSuccess: () => void;
};

const PreviewInventoryGroup = ({ onClose, areaData, inventoryGroupCode, clearArea, onSubmitSuccess }: PreviewChangesProps) => {
    const [showScripts, setShowScripts] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const script = generateInvScript(areaData, inventoryGroupCode);

    const handleSubmit = async () => {
        try {
            setLoadingSubmit(true);

            const areas = Object.entries(areaData)
                .filter(([_, value]) => value.checked)
                .map(([areaName, data]) => ({
                    areaName,
                    ocrCode: data.ocrCode,
                    ocr_area_status: data.ocr_area_status,
                    ocr_code_status: data.ocr_code_status
                }));

            await submitInventoryOcr({
                inventoryGroupCode,
                areas,
            });

            setLoadingSubmit(false);
            setShowSuccess(true);
            onSubmitSuccess();
        } catch (err) {
            console.error('Error submitting inventory OCR:', err);
            setLoadingSubmit(false);
            alert('Failed to submit. Please try again.');
        }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 flex bg-[#FAFAFA] shadow-md rounded p-4 h-160">
            {loadingSubmit && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white font-medium">Submitting...</span>
                    </div>
                </div>
            )}
            {showSuccess && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="bg-white rounded p-4 shadow-lg flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <LuCircleCheckBig size={40} color='green'/>
                        </div>
                        <h3 className="text-lg font-semibold text-black">Executed Successfully!</h3>
                        <button 
                            className="button p-2 w-16 rounded text-white"
                            onClick={() => {
                                clearArea();
                                setShowSuccess(false);
                                onClose();
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-4 h-full w-96">
                <div className="flex flex-col mb-4">
                    <h2 className="text-lg font-bold">Inventory Group OCR</h2>
                    <button
                        className="text-blue-400 text-sm hover:underline self-start"
                        onClick={() => setShowScripts(prev => !prev)}
                    >
                        { showScripts ? "Hide Scripts" : "Show Scripts"}
                    </button>
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <p className="font-semibold">Inventory Group</p>
                        <p className="text-gray-600">{inventoryGroupCode}</p>
                    </div>

                    <div>
                        {/* Header */}
                        <div className="grid grid-cols-2 font-semibold text-sm pb-4">
                            <span>Area</span>
                            <span>OCR Code</span>
                        </div>

                        {/* Rows */}
                        <div className="grid grid-cols-2 gap-y-4 max-h-96 overflow-y-auto">
                            {Object.entries(areaData)
                                .filter(([_, value]) => value.checked)
                                .map(([area, data]) => (
                                <Fragment key={area}>
                                    <span className="text-sm text-gray-600">
                                        {area}
                                    </span>
                                    <input
                                        className="text-sm font-mono w-fit w-32 py-1 px-2 rounded bg-gray-200"
                                        defaultValue={data.ocrCode}
                                    />
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center gap-4">                
                    <button 
                        className="bg-gray-200 w-32 h-8 rounded hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="bg-blue-300 w-32 h-8 rounded button"
                        onClick={handleSubmit}
                    >
                        Execute
                    </button>
                </div>
            </div>
            <div
                className={`bg-[#FAFAFA] transition-all duration-300 overflow-hidden
                    ${showScripts ? "w-120 border-l border-gray-300 pl-4 ml-4" : "w-0 border-none"}
                `}
            >
                <div className="relative h-full">
                    <textarea
                        className="h-full w-full p-2 resize-none"
                        value={script}
                        readOnly
                    />

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
  )
}

export default PreviewInventoryGroup;