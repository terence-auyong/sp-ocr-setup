'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { fetchAppOcrApi } from '@/services/app-ocr-api';
import { fetchAppModule } from '@/services/app-module';
import { fetchAppModuleExtended } from '@/services/app-module-extended';
import { fetchAppChannel } from '@/services/app-channel';
import { fetchAppStore } from '@/services/app-store';
import { fetchAppRegion } from '@/services/app-region';
import { fetchAppStoreChannel } from '@/services/app-store-channel';
import { fetchAppStoreGroup } from '@/services/app-store-group';
import { fetchAppStoreType } from '@/services/app-store-type';
import { Check, Download, Send } from 'lucide-react';
import {
    AppModule,
    AppOcrApi,
    AppRegion,
    AppStoreChannel,
    AppStoreGroup,
    AppStoreType,
} from '@/types/OcrTemplate';
import DropZone from '@/components/ocr-mapping-upload/DropZone';
import Badge from '@/components/ocr-mapping-upload/Badge';
import { resolvePayloads } from '@/utils/ocr-upload-mapping/resolvePayloads';
import { rowsToRaw } from '@/utils/ocr-upload-mapping/rowsToRaw';
import { buildErrorWorkbook } from '@/utils/ocr-upload-mapping/buildErrorWorkbook';
import EmailErrorModal from '@/components/ocr-mapping-upload/EmailErrorModal';
import { LuCircleCheckBig } from 'react-icons/lu';
import { useUploadStore } from '@/hooks/ocr-mapping-upload/useUpload';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppStore {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
    store_type_id: number | null;
    store_group_id: number | null;
}

export interface AppChannel {
    id: number;
    code: string;
    name: string;
    store_channel_id: number | null;
}

export interface Group {
    siteGroup: AppChannel;
    store: AppStore;
    region: AppRegion | null;
    storeChannel: AppStoreChannel | null;
    storeGroup: AppStoreGroup | null;
    storeType: AppStoreType | null;
    startDate: string | null;
    endDate: string | null;
    isDelete: number | null;
}

interface Batch {
    id: string;
    maxScan: number;
    groups: Group[];
}

export interface OcrPayload {
    ocrCode: string;
    ocrName: string;
    description: string;
    ocrApi: AppOcrApi | null;
    moduleCode: AppModule | null;
    extendedModuleCodes: AppModule[];
    batches: Batch[];
}

interface SendResult {
    payload: OcrPayload;
    status: 'success' | 'error';
    message?: string;
}

export interface RawGroup {
    siteGroupCode: string;
    storeCode: string;
    regionCode: string;
    channelCode: string;
    storeGroupCode: string;
    storeTypeCode: string;
    startDate: string | null;
    endDate: string | null;
    isDelete: string;
    rowNumber: number;
    moduleInventory: string;
    moduleNearExpiry: string;
    moduleOsa: string;
    moduleShareOfShelf: string;
}

export interface RawBatch {
    id: string;
    maxScan: number;
    groups: RawGroup[];
    groupMap: Record<string, RawGroup>;
    rowNumbers: number[];
}

export interface RawPayload {
    ocrCode: string;
    ocrName: string;
    description: string;
    ocrApiName: string;
    moduleInventory: string;
    moduleNearExpiry: string;
    moduleOsa: string;
    moduleShareOfShelf: string;
    batches: RawBatch[];
    batchMap: Record<string, RawBatch>;
    rowNumbers: number[];
    emptyLocationRows: number[];
}

export interface RowError {
    column: string;
    message: string;
}

interface OcrExcelUploaderProps {
    apiUrl?: string;
    onComplete?: (results: SendResult[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const OcrExcelUploader = ({
    apiUrl = '/api/ocr-upload',
    onComplete,
}: OcrExcelUploaderProps) => {
    const { startUpload, isUploading, uploadError, clearStore } =
        useUploadStore();

    const [rawPayloads, setRawPayloads] = useState<RawPayload[] | null>(null);
    const [payloads, setPayloads] = useState<OcrPayload[] | null>(null);
    const [resolveErrors, setResolveErrors] = useState<string[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rowCount, setRowCount] = useState(0);
    const [results, setResults] = useState<SendResult[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rowErrorMap, setRowErrorMap] = useState<Record<number, RowError[]>>(
        {},
    );
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const { data: appOcrApi = [] } = useQuery<AppOcrApi[]>({
        queryKey: ['appOcrApi'],
        queryFn: fetchAppOcrApi,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appModule = [] } = useQuery<AppModule[]>({
        queryKey: ['appModule'],
        queryFn: fetchAppModule,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: appModuleExtended = [] } = useQuery<AppModule[]>({
        queryKey: ['appModuleExtended'],
        queryFn: fetchAppModuleExtended,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: channels = [] } = useQuery<AppChannel[]>({
        queryKey: ['app-channels'],
        queryFn: fetchAppChannel,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: stores = [] } = useQuery<AppStore[]>({
        queryKey: ['app-stores'],
        queryFn: fetchAppStore,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: regions = [] } = useQuery<AppRegion[]>({
        queryKey: ['app-regions'],
        queryFn: fetchAppRegion,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeChannels = [] } = useQuery<AppStoreChannel[]>({
        queryKey: ['app-store-channels'],
        queryFn: fetchAppStoreChannel,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeGroups = [] } = useQuery<AppStoreGroup[]>({
        queryKey: ['app-store-groups'],
        queryFn: fetchAppStoreGroup,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: storeTypes = [] } = useQuery<AppStoreType[]>({
        queryKey: ['app-store-types'],
        queryFn: fetchAppStoreType,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    useEffect(() => {
        if (!rawPayloads) return;
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
        setPayloads(resolved);
        setResolveErrors(errors);
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
                    type: 'array',
                    cellStyles: true,
                });

                const targetSheet = 'OCR Mapping';
                const ws = wb.Sheets[targetSheet];

                if (!ws) {
                    setParseError(
                        `Sheet "${targetSheet}" not found. Please use the correct template.`,
                    );
                    return;
                }

                const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
                    header: 1,
                    defval: '',
                });

                const mainHeaders = allRows[0] as string[];
                const subHeaderRow = allRows[3] as string[];
                const dataRows = allRows.slice(4);

                const headers = mainHeaders.map((h, i) => {
                    const main = String(h || '').trim();
                    const sub = String(subHeaderRow[i] || '').trim();
                    return sub || main;
                });

                const rows = dataRows
                    .map((row) =>
                        headers.reduce<Record<string, unknown>>(
                            (acc, key, i) => {
                                if (key) acc[key] = (row as unknown[])[i] ?? '';
                                return acc;
                            },
                            {},
                        ),
                    )
                    .filter((row) =>
                        Object.values(row).some((v) => String(v).trim() !== ''),
                    );

                if (!rows.length) {
                    setParseError('No data rows found starting at Row 5.');
                    return;
                }

                const raws = rowsToRaw(rows);
                setRowCount(rows.length);
                setRawPayloads(raws);
            } catch (err) {
                setParseError(
                    `Failed to parse file: ${(err as Error).message}`,
                );
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    /**
     * Builds the error workbook and sends it to the API route,
     * which emails it as an attachment to the provided address.
     */
    const handleSendErrorEmail = async (email: string) => {
        if (!originalFile || !fileName) throw new Error('No file available.');

        const buffer = await buildErrorWorkbook(originalFile, rowErrorMap);

        // Convert ArrayBuffer → base64 for JSON transport
        const base64 = Buffer.from(buffer).toString('base64');

        const res = await fetch('/api/send-error-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, fileName, fileBase64: base64 }),
        });

        if (!res.ok) {
            const { error } = await res.json().catch(() => ({}));
            throw new Error(error ?? `Server error ${res.status}`);
        }
    };

    const handleSend = async () => {
        if (!payloads) return;

        startUpload(apiUrl, payloads).catch((err) => {
            console.error('Upload failed:', err);
        });

        clearArea();
    };

    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = '/templates/OCR_Mapping_Form.xlsx';
        link.download = 'OCR_Mapping_Form.xlsx';
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

    const canSend =
        payloads !== null && resolveErrors.length === 0 && !isUploading;

    const hasData = payloads !== null;
    const hasErrors = resolveErrors.length > 0;

    // The button is "clickable" only if there is data, no errors, and we aren't already uploading
    const canClickSubmit = hasData && !hasErrors && !isUploading;

    return (
        <>
            {showSuccess && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <div className="bg-white rounded p-4 shadow-lg flex flex-col items-center gap-3 w-64">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <LuCircleCheckBig size={40} color="green" />
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

            {showErrorModal && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
                    <div className="bg-white rounded p-6 shadow-xl flex flex-col items-center gap-4 w-80">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                Upload Failed
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {uploadError ||
                                    'There was a problem processing your request.'}
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
                    {isUploading ? (
                        <div className="w-full h-full border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium text-gray-400">
                                Uploading file...
                            </p>
                        </div>
                    ) : (
                        <DropZone
                            onFile={handleFile}
                            disabled={isUploading}
                            fileName={fileName}
                        />
                    )}
                </div>

                {parseError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {parseError}
                    </div>
                )}

                {resolveErrors.length > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-semibold text-red-700">
                                Error — cannot proceed
                            </p>
                            <button
                                onClick={() => setEmailModalOpen(true)}
                                className="flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                            >
                                <Send size={12} />
                                Send Report
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {hasData && (
                            <Badge variant="blue">{rowCount} rows</Badge>
                        )}
                        {hasErrors && (
                            <Badge variant="red">
                                With error
                                {resolveErrors.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={clearArea}
                            disabled={!hasData || isUploading}
                            className="text-sm px-4 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Remove
                        </button>

                        <button
                            onClick={handleSend}
                            disabled={!canClickSubmit}
                            className={`text-sm px-5 py-2 rounded font-semibold text-white transition-colors 
                                ${
                                    canClickSubmit
                                        ? 'bg-blue-500 hover:bg-blue-600'
                                        : 'bg-gray-300 cursor-not-allowed opacity-70'
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
                onSend={handleSendErrorEmail}
            />
        </>
    );
};

export default OcrExcelUploader;
