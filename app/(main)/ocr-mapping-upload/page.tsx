"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { fetchAppOcrApi } from "@/services/app-ocr-api";
import { fetchAppModule } from "@/services/app-module";
import { fetchAppModuleExtended } from "@/services/app-module-extended";
import { fetchAppChannel } from "@/services/app-channel";
import { fetchAppStore } from "@/services/app-store";
import { fetchAppRegion } from "@/services/app-region";
import { fetchAppStoreChannel } from "@/services/app-store-channel";
import { fetchAppStoreGroup } from "@/services/app-store-group";
import { fetchAppStoreType } from "@/services/app-store-type";
import { Download } from "lucide-react";
import DropZone from "@/components/ocr-mapping-upload/DropZone";
import Badge from "@/components/ocr-mapping-upload/Badge";
import { resolvePayloads } from "@/utils/ocr-upload-mapping/resolvePayloads";
import { rowsToRaw } from "@/utils/ocr-upload-mapping/rowsToRaw";
import { buildErrorWorkbook } from "@/utils/ocr-upload-mapping/buildErrorWorkbook";
import EmailErrorModal from "@/components/ocr-mapping-upload/EmailErrorModal";
import { CircleCheckBig } from "lucide-react";
import { useUploadStore } from "@/hooks/ocr-mapping-upload/useUpload";
import { 
    AppChannel, 
    AppStore, 
    OcrPayload, 
    RawPayload, 
    RowError, 
    SendResult 
} from "@/types/ocrMappingUpload";
import { AppModule, AppOcrApi, AppRegion, AppStoreChannel, AppStoreGroup, AppStoreType } from "@/types/ocrTemplate";

interface OcrExcelUploaderProps {
    apiUrl?: string;
}

const OcrExcelUploader = ({
    apiUrl = "/api/ocr-upload"
}: OcrExcelUploaderProps) => {
    const { startUpload, isUploading, uploadError, clearStore } =
        useUploadStore();

    const [rawPayloads, setRawPayloads] = useState<RawPayload[] | null>(null);
    const [payloads, setPayloads] = useState<OcrPayload[] | null>(null);
    const [resolveErrors, setResolveErrors] = useState<string[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);

    const [rowCount, setRowCount] = useState(0);
    const [results, setResults] = useState<SendResult[] | null>(null);

    const [isParsing, setIsParsing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rowErrorMap, setRowErrorMap] = useState<Record<number, RowError[]>>(
        {},
    );
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // ─── Queries ──────────────────────────────────────────────────────────────

    const { data: appOcrApi = [] } = useQuery<AppOcrApi[]>({
        queryKey: ["appOcrApi"],
        queryFn: fetchAppOcrApi,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appModule = [] } = useQuery<AppModule[]>({
        queryKey: ["appModule"],
        queryFn: fetchAppModule,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appModuleExtended = [] } = useQuery<AppModule[]>({
        queryKey: ["appModuleExtended"],
        queryFn: fetchAppModuleExtended,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: channels = [] } = useQuery<AppChannel[]>({
        queryKey: ["app-channels"],
        queryFn: fetchAppChannel,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: stores = [] } = useQuery<AppStore[]>({
        queryKey: ["app-stores"],
        queryFn: fetchAppStore,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: regions = [] } = useQuery<AppRegion[]>({
        queryKey: ["app-regions"],
        queryFn: fetchAppRegion,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeChannels = [] } = useQuery<AppStoreChannel[]>({
        queryKey: ["app-store-channels"],
        queryFn: fetchAppStoreChannel,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeGroups = [] } = useQuery<AppStoreGroup[]>({
        queryKey: ["app-store-groups"],
        queryFn: fetchAppStoreGroup,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeTypes = [] } = useQuery<AppStoreType[]>({
        queryKey: ["app-store-types"],
        queryFn: fetchAppStoreType,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    // ─── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!rawPayloads || rawPayloads.length === 0) return;

        const queriesLoading =
            !appOcrApi.length && !channels.length && !stores.length;

        if (queriesLoading) return;

        const {
            payloads: resolved,
            errors,
            rowErrorMap: errorsMap,
        } = resolvePayloads(
            rawPayloads,
            appOcrApi,
            appModule,
            appModuleExtended,
            channels,
            stores,
            regions,
            storeChannels,
            storeGroups,
            storeTypes,
        );

        setPayloads((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(resolved)) return prev;
            return resolved;
        });

        setResolveErrors((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(errors)) return prev;
            return errors;
        });

        setRowErrorMap(errorsMap);
    }, [
        rawPayloads,
        appOcrApi,
        appModule,
        appModuleExtended,
        channels,
        stores,
        regions,
        storeChannels,
        storeGroups,
        storeTypes,
    ]);

    useEffect(() => {
        if (results) {
            setShowSuccess(true);
        }
    }, [results]);

    useEffect(() => {
        if (uploadError) {
            setShowErrorModal(true);
        }
    }, [uploadError]);

    const handleFile = useCallback((file: File) => {
        setIsParsing(true);
        setOriginalFile(file);
        setFileName(file.name);
        setParseError(null);
        setPayloads(null);
        setRawPayloads(null);
        setResults(null);
        setResolveErrors([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target?.result, {
                    type: "array",
                    cellStyles: true,
                });

                const targetSheet = "OCR Mapping";
                const ws = wb.Sheets[targetSheet];

                if (!ws) {
                    setParseError(
                        `Sheet "${targetSheet}" not found. Please use the correct template.`,
                    );
                    return;
                }

                const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
                    header: 1,
                    defval: "",
                });

                const mainHeaders = allRows[0] as string[];
                const subHeaderRow = allRows[3] as string[];
                const dataRows = allRows.slice(4);

                const headers = mainHeaders.map((h, i) => {
                    const main = String(h || "").trim();
                    const sub = String(subHeaderRow[i] || "").trim();
                    return sub || main;
                });

                const rows = dataRows
                    .map((row) =>
                        headers.reduce<Record<string, unknown>>(
                            (acc, key, i) => {
                                if (key) acc[key] = (row as unknown[])[i] ?? "";
                                return acc;
                            },
                            {},
                        ),
                    )
                    .filter((row) =>
                        Object.values(row).some((v) => String(v).trim() !== ""),
                    );

                if (!rows.length) {
                    setParseError("No data rows found starting at Row 5.");
                    return;
                }

                const raws = rowsToRaw(rows);
                setRowCount(rows.length);
                setRawPayloads(raws);
            } catch (err) {
                setParseError(
                    `Failed to parse file: ${(err as Error).message}`,
                );
            } finally {
                setIsParsing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    // Called from EmailErrorModal once the user confirms their email.
    const handleModalConfirm = async (email: string) => {
        setEmailModalOpen(false);
        setShowSuccess(false);

        const EMAIL_API_ROUTE = "/api/send-error-report";

        if (hasErrors) {
            if (!originalFile || !fileName)
                throw new Error("No file available.");

            const buffer = await buildErrorWorkbook(originalFile, rowErrorMap);
            const base64 = Buffer.from(buffer).toString("base64");

            const res = await fetch(EMAIL_API_ROUTE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    fileName,
                    fileBase64: base64,
                    subject: "OCR Mapping Upload",
                    message:
                        "There were errors on your upload. Please click on the link below to view your file and try again.",
                }),
            });

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({}));
                throw new Error(error ?? `Server error ${res.status}`);
            }

            clearArea();
            setShowSuccess(true);
        } else {
            if (!payloads) return;

            try {
                await startUpload(apiUrl, payloads);
                await fetch(EMAIL_API_ROUTE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        fileName,
                        subject: "OCR Mapping Upload",
                        message: "Your OCR mapping data from has been successfully uploaded.",
                    }),
                });

                clearArea();
                setShowSuccess(true);
            } catch (err) {
                console.error("Upload failed:", err);
                clearArea();
            }
        }
    };

    const downloadTemplate = () => {
        const link = document.createElement("a");
        link.href = "/templates/OCR_Mapping_Form.xlsx";
        link.download = "OCR_Mapping_Form.xlsx";
        link.click();
    };

    const clearArea = () => {
        setOriginalFile(null);
        setPayloads(null);
        setRawPayloads(null);
        setFileName(null);
        setResolveErrors([]);
        setParseError(null);
        setResults(null);
        setRowCount(0);
    };

    const isLoading = isUploading || isParsing;
    const hasData = payloads !== null;
    const hasErrors = resolveErrors.length > 0;
    const canClickSubmit = hasData && !isLoading;

    return (
        <>
            {/* Success Modal */}
            {showSuccess && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="bg-white rounded p-4 shadow-lg flex flex-col items-center gap-3 w-64">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CircleCheckBig size={40} color="green" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-black">
                                Executed Successfully!
                            </h3>
                        </div>
                        <button
                            className="bg-blue-500 hover:bg-blue-600 p-2 w-full rounded text-white font-medium transition-colors"
                            onClick={() => {
                                clearArea();
                                setShowSuccess(false);
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Failure Modal */}
            {showErrorModal && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
                    <div className="bg-white rounded p-6 shadow-xl flex flex-col items-center gap-4 w-80">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                Upload Failed
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {uploadError ||
                                    "There was a problem processing your request."}
                            </p>
                        </div>
                        <button
                            className="bg-red-600 hover:bg-red-700 w-full py-2 rounded text-white font-medium transition-colors"
                            onClick={() => {
                                clearStore();
                                setShowErrorModal(false);
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Main Component */}
            <div className="max-w-168 bg-white p-4 rounded-sm mx-auto font-sans space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="font-bold text-lg">OCR Mapping Upload</h1>
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <Download size={14} />
                        Download Template
                    </button>
                </div>

                <div className="w-160 h-80 relative">
                    {isLoading ? (
                        <div className="w-full h-full border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium text-gray-400">
                                Uploading file...
                            </p>
                        </div>
                    ) : (
                        <DropZone
                            onFile={handleFile}
                            disabled={isLoading}
                            fileName={fileName}
                        />
                    )}
                </div>

                {parseError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {parseError}
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {hasData && (
                            <Badge variant="blue">{rowCount} rows</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={clearArea}
                            disabled={!hasData || isLoading}
                            className="text-sm px-4 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Remove
                        </button>
                        <button
                            onClick={() => setEmailModalOpen(true)}
                            disabled={!canClickSubmit}
                            className={`text-sm px-5 py-2 rounded font-semibold text-white transition-colors 
                                ${
                                    canClickSubmit
                                        ? "bg-blue-500 hover:bg-blue-600"
                                        : "bg-gray-300 cursor-not-allowed opacity-70"
                                }`}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
            <EmailErrorModal
                isOpen={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                onSend={handleModalConfirm}
            />
        </>
    );
};

export default OcrExcelUploader;
