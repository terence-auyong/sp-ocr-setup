import { useState } from 'react';
import { LuCircleCheckBig } from "react-icons/lu";
import { generateUomScript } from '@/utils/scripts';
import { submitUomOcr } from '@/services/uom-ocr';

type PreviewChangesProps = {
    onClose: () => void; 
    selectedUomList: Uom[]; // Changed from Uom | null
    refetch: () => void;
};

const PreviewUom = ({ onClose, selectedUomList, refetch }: PreviewChangesProps) => {
    const [showScripts, setShowScripts] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Assuming generateUomScript takes a single Uom item, map over the list
    const script = selectedUomList.map(uom => generateUomScript(uom)).join('\n');

    const handleSubmit = async () => {
        // Filter out items that don't have an ocr_code set
        const itemsToSubmit = selectedUomList.filter(u => u.ocr_code && u.ocr_code.trim() !== "");

        if (itemsToSubmit.length === 0) {
            alert('No items with valid OCR codes found.');
            return;
        }

        try {
            setLoadingSubmit(true);
            
            // Execute all submissions in parallel
            await Promise.all(itemsToSubmit.map(item => 
                submitUomOcr({
                    shortName: item.short_name,
                    ocrCode: item.ocr_code,
                })
            ));
            
            refetch();
            setLoadingSubmit(false);
            setShowSuccess(true);
        } catch (err) {
            console.error('Error submitting bulk inventory OCR:', err);
            setLoadingSubmit(false);
            alert('Failed to submit some or all items. Please try again.');
        }
    };
    
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 flex bg-[#FAFAFA] shadow-md rounded-sm p-4 h-160 max-w-200 overflow-hidden">
            {/* Loading spinner */}
            {loadingSubmit && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white font-medium">Submitting...</span>
                    </div>
                </div>
            )}

            {/* Success modal */}
            {showSuccess && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="bg-white rounded p-4 shadow-lg flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <LuCircleCheckBig size={40} color='green'/>
                        </div>
                        <h3 className="text-lg font-semibold text-black">Executed Successfully!</h3>
                        <button 
                            className="button p-2 w-full rounded text-white font-bold"
                            onClick={() => {
                                setShowSuccess(false);
                                onClose();
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 h-full w-100">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold">Review Changes</h2>
                        <span className="text-sm text-gray-400">({selectedUomList.length} items)</span>
                    </div>
                    <button
                        className="text-blue-400 text-sm hover:underline"
                        onClick={() => setShowScripts(prev => !prev)}
                    >
                        { showScripts ? "Hide Scripts" : "Show Scripts"}
                    </button>
                </div>

                <div className="flex-1 overflow-auto rounded min-h-0">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="text-left bg-gray-100">
                                <th className="p-4">Unit of Measure</th>
                                <th className="p-4">OCR Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedUomList.map((item) => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-4">{item.long_name}</td>
                                    <td className="p-4 font-mono bg-gray-50">{item.ocr_code}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center gap-4 mt-4">                
                    <button className="bg-gray-200 w-32 p-2 rounded hover:bg-gray-300" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="bg-blue-300 w-32 p-2 rounded text-white font-bold hover:bg-blue-400" onClick={handleSubmit}>
                        Execute All
                    </button>
                </div>
            </div>
            
            <div className={`transition-all duration-300 ${showScripts ? "w-100 ml-4 border-l" : "w-0"}`}>
                {showScripts && 
                    <>
                        <textarea className="text-sm h-full w-full p-2" value={script} readOnly />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(script);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }}
                            className="absolute top-6 right-10 bg-blue-300 text-white text-sm px-2 py-1 rounded hover:bg-blue-400 transition"
                        >
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </>             
                }
            </div>
        </div>
    </div>
  )
}

export default PreviewUom;