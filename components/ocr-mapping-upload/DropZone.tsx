import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const DropZone = ({
    onFile,
    disabled,
    fileName,
}: {
    onFile: (f: File) => void;
    disabled?: boolean;
    fileName: string | null;
}) => {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
        },
        [onFile]
    );

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`
                w-160 h-80 relative border-2 border-dashed rounded-lg px-6 py-10 text-center transition-colors
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
            `}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { onFile(f); e.target.value = ""; }
                }}
            />
            <div className="flex flex-col items-center justify-center h-full gap-2">
                {fileName ? (
                    <div className="space-y-1 flex flex-col items-center">
                        <Upload size={40} color="gray" />
                        <p className="text-sm font-bold text-blue-600">{fileName}</p>
                        <p className="text-xs text-gray-500 italic">Click or drag to replace</p>
                    </div>
                ) : (
                    <>
                        <Upload size={40} color="gray" />
                        <p className="text-sm font-medium text-gray-800">
                            Drop your spreadsheet here, or{" "}
                            <span className="text-blue-600 underline underline-offset-2">browse</span>
                        </p>
                        <p className="text-xs text-gray-400">.xlsx files</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default DropZone;
