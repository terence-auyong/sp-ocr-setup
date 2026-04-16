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
import { Check, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { AppModule, AppOcrApi, AppRegion, AppStoreChannel, AppStoreGroup, AppStoreType } from "@/types/OcrTemplate";
import DropZone from "@/components/ocr-mapping-upload/DropZone";
import Badge from "@/components/ocr-mapping-upload/Badge";
import { resolvePayloads } from "@/utils/ocr-upload-mapping/resolvePayloads";
import { rowsToRaw } from "@/utils/ocr-upload-mapping/rowsToRaw";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppStore {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
    store_type_id: number | null; 
    store_group_id: number | null;
}

interface AppChannel {
    id: number;
    code: string;
    name: string;
    store_channel_id: number | null; 
}

interface Group {
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

interface OcrPayload {
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
    status: "success" | "error";
    message?: string;
}

// ─── Lookup resolution ────────────────────────────────────────────────────────
interface RawGroup {
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

interface RawBatch {
    id: string;
    maxScan: number;
    groups: RawGroup[];
    groupMap: Record<string, RawGroup>;
}

interface RawPayload {
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

interface RowError {
    column: string;
    message: string;
}

interface OcrExcelUploaderProps {
    apiUrl?: string;
    onComplete?: (results: SendResult[]) => void;
}

const OcrExcelUploader = ({
    apiUrl = "/api/ocr-upload",
    onComplete,
}: OcrExcelUploaderProps) => {
    const [rawPayloads, setRawPayloads] = useState<RawPayload[] | null>(null);
    const [payloads, setPayloads] = useState<OcrPayload[] | null>(null);
    const [resolveErrors, setResolveErrors] = useState<string[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rowCount, setRowCount] = useState(0);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<SendResult[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rowErrorMap, setRowErrorMap] = useState<Record<number, RowError[]>>({});
    const [originalFile, setOriginalFile] = useState<File | null>(null);

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
    }, [rawPayloads, appOcrApi, appModule, appModuleExtended, channels, stores, regions, storeChannels, storeGroups, storeTypes]);

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
                const wb = XLSX.read(e.target?.result, { type: "array", cellStyles: true });

                const targetSheet = "OCR Mapping";
                const ws = wb.Sheets[targetSheet];

                if (!ws) {
                    setParseError(`Sheet "${targetSheet}" not found. Please use the correct template.`);
                    return;
                }

                const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

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
                        headers.reduce<Record<string, unknown>>((acc, key, i) => {
                            if (key) acc[key] = (row as unknown[])[i] ?? "";
                            return acc;
                        }, {})
                    )
                    .filter((row) => Object.values(row).some((v) => String(v).trim() !== ""));

                if (!rows.length) { setParseError("No data rows found starting at Row 5."); return; }

                const raws = rowsToRaw(rows);
                setRowCount(rows.length);
                setRawPayloads(raws);
            } catch (err) {
                setParseError(`Failed to parse file: ${(err as Error).message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const downloadErrorFile = async () => {
        if (!fileName || !originalFile) return;

        const arrayBuffer = await originalFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const ws = workbook.getWorksheet("OCR Mapping");
        if (!ws) return;

        // --- 1. BUILD COLUMN MAP ---
        const columnMapping: Record<string, number> = {};
        const totalCols = ws.actualColumnCount;
        for (let col = 1; col <= totalCols; col++) {
            const r1val = ws.getRow(1).getCell(col).value?.toString().trim().toLowerCase();
            if (r1val) columnMapping[r1val] = col;

            const r4val = ws.getRow(4).getCell(col).value?.toString().trim().toLowerCase();
            if (r4val) columnMapping[r4val] = col;
        }

        const moduleSubHeaders = ["inventory", "near expiry", "osa", "share of shelf"];
        let moduleColStart = columnMapping["module code"]; // column N
        if (moduleColStart) {
            moduleSubHeaders.forEach((name, i) => {
                if (!columnMapping[name]) {
                    columnMapping[name] = moduleColStart + i;
                }
            });
        }

        // --- 2. RESET ALL DATA ROWS (row 5 onwards) ---
        ws.eachRow((row, rowNum) => {
            if (rowNum < 5) return;
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = { type: 'pattern', pattern: 'none' }; 
                cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
                cell.border = {}; 
            });
        });

        // --- 3. COLLECT ALL CELLS THAT NEED HIGHLIGHTING ---
        const highlightCells = new Map<string, { fill: string; fontColor: string; bold: boolean }>();
        const errorMessages = new Map<number, string>();

        Object.entries(rowErrorMap).forEach(([rowNumStr, errorList]) => {
            const rowIdx = parseInt(rowNumStr);
            errorMessages.set(rowIdx, errorList.map(e => e.message).join("\n"));

            errorList.forEach(({ column }) => {
                const targetIdx = columnMapping[column.toLowerCase().trim()];
                if (targetIdx > 0) {
                    highlightCells.set(`${rowIdx}-${targetIdx}`, {
                        fill: 'FFFF0000',
                        fontColor: 'FF000000',
                        bold: true,
                    });
                }
            });
        });

        // --- 4. PREPARE THE ERRORS COLUMN ---
        let lastColNumber = -1;

        // a. Scan existing columns for "ERROR MESSAGE"
        ws.columns.forEach((col, colIdx) => {
            for (let i = 1; i <= 4; i++) {
                const cellValue = ws.getCell(i, colIdx + 1).value?.toString().trim().toUpperCase();
                if (cellValue === "ERROR MESSAGE") {
                    lastColNumber = colIdx + 1;
                    break;
                }
            }
        });

        // b. If not found, create it at the end
        if (lastColNumber === -1) {
            lastColNumber = ws.actualColumnCount + 1;
        }

        const errorColumn = ws.getColumn(lastColNumber);
        errorColumn.width = 60; 

        // c. Clear data from previous runs (wipes old messages)
        errorColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber > 4) {
                cell.value = null;
                cell.fill = { type: 'pattern', pattern: 'none' };
                cell.border = {};
            }
        });

        // d. Style the Header (ALL CAPS, SIZE 12, ITALIC, NOT BOLD, BLACK BORDER)
        const headerCell = ws.getCell(1, lastColNumber);
        try {
            if (!headerCell.isMerged) ws.mergeCells(1, lastColNumber, 4, lastColNumber);
        } catch (_) { /* already merged */ }

        headerCell.style = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
            font: { 
                name: 'Calibri',
                size: 12,
                bold: true,
                italic: true, 
                color: { argb: 'FFFFFFFF' } 
            },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
            }
        };
        headerCell.value = "ERROR MESSAGE";


        // --- 5. APPLY ERROR HIGHLIGHTS ---
        const touchedRows = new Set(errorMessages.keys());

        touchedRows.forEach((rowIdx) => {
            const row = ws.getRow(rowIdx);
            row.height = 15;

            const summaryCell = row.getCell(lastColNumber);
            summaryCell.style = {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
                font: { 
                    name: 'Calibri',
                    color: { argb: '#000000' }, 
                    bold: false, 
                    size: 11 
                },
                alignment: { wrapText: true, vertical: 'top', horizontal: 'left' },
            };
            summaryCell.value = errorMessages.get(rowIdx) ?? "";

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const key = `${rowIdx}-${colNumber}`;
                if (highlightCells.has(key)) {
                    cell.style = {
                        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
                        font: { color: { argb: 'FFFFFFFF' }, bold: true },
                        border: {
                            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        }
                    };
                }
            });
        });

        // --- 6. TRIGGER DOWNLOAD ---
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
    };

    const handleSend = async () => {
        if (!payloads) return;
        setSending(true);
        setResults(null);

        const out: SendResult[] = [];

        for (const payload of payloads) {
            try {
                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    out.push({ payload, status: "success" });
                } else {
                    const text = await res.text();
                    out.push({ payload, status: "error", message: text });
                }
            } catch (err) {
                out.push({ payload, status: "error", message: (err as Error).message });
            }
        }

        setSending(false);
        setResults(out);
        onComplete?.(out);
    };

    const downloadTemplate = () => {
        const link = document.createElement("a");
        link.href = "/templates/OCR_Mapping_Form.xlsx";
        link.download = "OCR_Mapping_Form.xlsx";
        link.click();
    }

    const reset = () => {
        setOriginalFile(null);
        setPayloads(null);
        setRawPayloads(null);
        setFileName(null);
        setResolveErrors([]);
        setParseError(null);
        setResults(null);
        setRowCount(0);
    };

    const successCount = results?.filter((r) => r.status === "success").length ?? 0;
    const failCount = results?.filter((r) => r.status === "error").length ?? 0;
    const canSend = payloads !== null && resolveErrors.length === 0 && !sending;

    return (
        <div className="max-w-168 bg-white p-4 rounded-sm mx-auto font-sans space-y-4">
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

            <DropZone onFile={handleFile} disabled={sending} fileName={fileName} />

            {parseError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {parseError}
                </div>
            )}

            {resolveErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold text-red-700">Error cannot proceed</p>
                        <button
                            onClick={downloadErrorFile}
                            className="flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                        >
                            <Download size={12} />
                            Download
                        </button>
                    </div>
                </div>
            )}

            {payloads && (
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="blue">{rowCount} rows</Badge>
                        {resolveErrors.length > 0 && (
                            <Badge variant="red">
                                With error{resolveErrors.length !== 1 ? "s" : ""}
                            </Badge>
                        )}
                        {results && successCount > 0 && 
                            <Badge variant="green">
                                <Check size={16} color="green"/> sent
                            </Badge>
                        }
                        {results && failCount > 0 && <Badge variant="red">failed</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={reset}
                            className="text-sm px-4 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Remove
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!canSend}
                            className="text-sm px-5 py-2 rounded font-semibold text-white bg-blue-300 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {sending ? "Sending…" : "Submit"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OcrExcelUploader;