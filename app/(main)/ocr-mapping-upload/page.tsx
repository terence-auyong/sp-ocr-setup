"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { fetchAppOcrApi } from "@/services/app-ocr-api";
import { fetchAppModule } from "@/services/app-module";
import { fetchAppModuleExtended } from "@/services/app-module-extended";
import { fetchAppChannel } from "@/services/app-channel";
import { fetchAppStore } from "@/services/app-store";
import { Upload, Download } from "lucide-react";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppOcrApi {
    id: number;
    code: string;
    name: string;
}

interface AppModule {
    id: number;
    code: string;
    name: string;
}

interface AppChannel {
    id: number;
    code: string;
    name: string;
}

interface AppStore {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
}

interface Store {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
}

interface SiteGroup {
    id: number;
    code: string;
    name: string;
}

interface Group {
    siteGroup: SiteGroup;
    stores: Store[];
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

// ─── Raw parsed shape ─────────────────────────────────────────────────────────

interface RawGroup {
    siteGroupCode: string;
    storeCodes: string[];
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
    moduleInventory: boolean;
    moduleNearExpiry: boolean;
    moduleOsa: boolean;
    moduleShareOfShelf: boolean;
    batches: RawBatch[];
    batchMap: Record<string, RawBatch>;
    rowNumbers: number[];
    emptyLocationRows: number[];
}

// ─── Auto-derive module name from OCR code ────────────────────────────────────

function deriveModuleName(ocrCode: string): string {
    if (ocrCode === "OCR Inside INV") return "Inventory";
    if (ocrCode === "Multiple OCR Module") return "OCR";
    return "";
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function rowsToRaw(rows: Record<string, unknown>[]): RawPayload[] {
    const byTemplate: Record<string, RawPayload> = {};
    let batchCounter = 0;

    const isY = (val: unknown) => String(val ?? "").trim().toLowerCase() === "y";

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const excelRowNumber = i + 5;

        const code = String(r["OCR Code"] ?? "").trim();
        const name = String(r["Name"] ?? "").trim();
        const templateKey = `${code}__${name}`;
        if (!code) continue;

        if (!byTemplate[templateKey]) {
            byTemplate[templateKey] = {
                ocrCode: code,
                ocrName: name,
                description: String(r["Description"] ?? "").trim(),
                ocrApiName: String(r["OCR API"] ?? "").trim(),
                moduleInventory: isY(r["Inventory"]),
                moduleNearExpiry: isY(r["Near Expiry"]),
                moduleOsa: isY(r["OSA"]),
                moduleShareOfShelf: isY(r["Share of Shelf"]),
                batches: [],
                batchMap: {},
                rowNumbers: [],
                emptyLocationRows: [],
            };
        }

        const tpl = byTemplate[templateKey];
        tpl.rowNumbers.push(excelRowNumber);

        const maxScan = Number(r["Max Scan"]) || 0;
        const batchKey = `maxScan_${maxScan}`;

        if (!tpl.batchMap[batchKey]) {
            const generatedId = `batch-${++batchCounter}-${Date.now()}`;
            const batch: RawBatch = { id: generatedId, maxScan, groups: [], groupMap: {} };
            tpl.batchMap[batchKey] = batch;
            tpl.batches.push(batch);
        }

        const batch = tpl.batchMap[batchKey];

        const siteGroupCodes = String(r["Site Group Code"] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        const storeCodes = String(r["Store Code"] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (siteGroupCodes.length === 0 && storeCodes.length === 0) {
            tpl.emptyLocationRows.push(excelRowNumber);
            continue;
        }

        if (storeCodes.length > 0) {
            // Store present — group by site group code so we can validate channel membership
            for (const siteGroupCode of siteGroupCodes.length > 0 ? siteGroupCodes : ["__NO_SITE_GROUP__"]) {
                if (!batch.groupMap[siteGroupCode]) {
                    const group: RawGroup = { siteGroupCode, storeCodes: [] };
                    batch.groupMap[siteGroupCode] = group;
                    batch.groups.push(group);
                }
                const group = batch.groupMap[siteGroupCode];
                for (const storeCode of storeCodes) {
                    if (!group.storeCodes.includes(storeCode)) {
                        group.storeCodes.push(storeCode);
                    }
                }
            }
        } else {
            for (const siteGroupCode of siteGroupCodes) {
                if (!batch.groupMap[siteGroupCode]) {
                    const group: RawGroup = { siteGroupCode, storeCodes: [] };
                    batch.groupMap[siteGroupCode] = group;
                    batch.groups.push(group);
                }
            }
        }
    }

    return Object.values(byTemplate);
}

// ─── Lookup resolution ────────────────────────────────────────────────────────

interface ResolveResult {
    payloads: OcrPayload[];
    errors: string[];
    rowErrorMap: Record<number, string[]>;
}

function resolvePayloads(
    raws: RawPayload[],
    ocrApis: AppOcrApi[],
    modules: AppModule[],
    extModules: AppModule[],
    allChannels: AppChannel[],
    allStores: AppStore[],
): ResolveResult {
    const errors: string[] = [];
    const rowErrorMap: Record<number, string[]> = {};
    const payloads: OcrPayload[] = [];

    const ALLOWED_OCR_CODES = ["OCR Inside INV", "Multiple OCR Module"];
    const ALLOWED_OCR_APIS = ["analyze document", "detect text"];

    const ocrApiMap = new Map(ocrApis.map((a) => [a.name.toLowerCase(), a]));
    const moduleMap = new Map(modules.map((m) => [m.name.toLowerCase(), m]));
    const extModuleMap = new Map(extModules.map((m) => [m.name.toLowerCase(), m]));
    const channelMap = new Map(
        allChannels.filter((c) => c?.code != null).map((c) => [c.code.toLowerCase(), c])
    );
    const storeMap = new Map(
        allStores.filter((s) => s?.store_code != null).map((s) => [s.store_code.toLowerCase(), s])
    );

    /**
     * Helper to map an error message to specific Excel row numbers
     * for the "Download Error File" feature.
     */
    const addErrorToRows = (rowNums: number[], msg: string) => {
        rowNums.forEach(num => {
            if (!rowErrorMap[num]) rowErrorMap[num] = [];
            rowErrorMap[num].push(msg);
        });
    };

    for (const raw of raws) {
        const label = raw.ocrName || raw.ocrCode;
        const rowLabel = raw.rowNumbers.length === 1
            ? `row ${raw.rowNumbers[0]}`
            : `rows ${raw.rowNumbers.join(", ")}`;
        const prefix = `[${rowLabel}] "${label}"`;

        // 1. Validate Location Rows (Site Group / Store Code)
        for (const rowNum of raw.emptyLocationRows) {
            const msg = `Site Group Code or Store Code is required — at least one must be provided`;
            errors.push(`[row ${rowNum}] "${label}": ${msg}`);
            addErrorToRows([rowNum], msg);
        }

        // 2. Validate OCR Code
        if (!ALLOWED_OCR_CODES.includes(raw.ocrCode)) {
            const msg = `OCR Code "${raw.ocrCode}" is not valid. Allowed: OCR Inside INV, Multiple OCR Module`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        // 3. Basic Field Validations
        if (!raw.ocrName) {
            const msg = "Name is empty";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }
        if (!raw.description) {
            const msg = "Description is empty";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }
        if (!raw.batches.length) {
            const msg = "No batches found";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        // 4. Max Scan Validation
        for (const batch of raw.batches) {
            if (!Number.isFinite(batch.maxScan) || batch.maxScan <= 0) {
                const msg = `Max Scan must be a positive number (value: ${batch.maxScan})`;
                errors.push(`${prefix}: ${msg}`);
                addErrorToRows(raw.rowNumbers, msg);
            }
        }

        // 5. OCR API Resolution
        const ocrApi = raw.ocrApiName ? (ocrApiMap.get(raw.ocrApiName.toLowerCase()) ?? null) : null;
        if (raw.ocrApiName && !ALLOWED_OCR_APIS.includes(raw.ocrApiName.toLowerCase())) {
            const msg = `OCR API "${raw.ocrApiName}" is not valid.`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        } else if (raw.ocrApiName && !ocrApi) {
            const msg = `OCR API "${raw.ocrApiName}" not found in database`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        // 6. Module Resolution (Auto-derived)
        const derivedModuleName = deriveModuleName(raw.ocrCode);
        const moduleCode = derivedModuleName
            ? (moduleMap.get(derivedModuleName.toLowerCase()) ?? null)
            : null;
        if (derivedModuleName && !moduleCode) {
            const msg = `Auto-derived module "${derivedModuleName}" not found in list`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        // 7. Extended Modules (Y/N Flags)
        const extendedModuleCodes: AppModule[] = [];

        if (raw.ocrCode === "OCR Inside INV") {
            if (!raw.moduleInventory) {
                const msg = "Inventory must be Y for OCR Inside INV";
                errors.push(`${prefix}: ${msg}`);
                addErrorToRows(raw.rowNumbers, msg);
            } else {
                const match = extModuleMap.get("inventory");
                if (match) extendedModuleCodes.push(match);
                else {
                    const msg = '"Inventory" not found in system modules';
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                }
            }
        } else if (raw.ocrCode === "Multiple OCR Module") {
            const selected = [
                { key: "inventory", flag: raw.moduleInventory },
                { key: "near expiry", flag: raw.moduleNearExpiry },
                { key: "osa", flag: raw.moduleOsa },
                { key: "share of shelf", flag: raw.moduleShareOfShelf },
            ].filter((m) => m.flag);

            if (selected.length === 0) {
                const msg = "At least one module must be Y (Inventory, Near Expiry, OSA, or Share of Shelf)";
                errors.push(`${prefix}: ${msg}`);
                addErrorToRows(raw.rowNumbers, msg);
            } else {
                for (const { key } of selected) {
                    const match = extModuleMap.get(key);
                    if (match) extendedModuleCodes.push(match);
                    else {
                        const msg = `"${key}" module not found in system`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg);
                    }
                }
            }
        }

        // 8. Site Group and Store Membership Resolution
        const resolvedBatches: Batch[] = raw.batches.map((batch) => {
            const resolvedGroups: Group[] = batch.groups.map((rawGroup) => {
                const { siteGroupCode } = rawGroup;
                const isNoSiteGroup = siteGroupCode === "__NO_SITE_GROUP__";

                const matchedChannel = isNoSiteGroup
                    ? null
                    : (channelMap.get(siteGroupCode.toLowerCase()) ?? null);

                if (!isNoSiteGroup && !matchedChannel) {
                    const msg = `Site Group Code "${siteGroupCode}" not found`;
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                }

                const siteGroup: SiteGroup = matchedChannel
                    ? { id: matchedChannel.id, code: matchedChannel.code, name: matchedChannel.name }
                    : { id: 0, code: "", name: "" };

                const resolvedStores: Store[] = [];
                for (const storeCode of rawGroup.storeCodes) {
                    const matchedStore = storeMap.get(storeCode.toLowerCase());
                    if (!matchedStore) {
                        const msg = `Store Code "${storeCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg);
                        continue;
                    }

                    if (!isNoSiteGroup && matchedChannel) {
                        if (matchedStore.channel_id !== matchedChannel.id) {
                            const msg = `Store "${storeCode}" does not belong to Site Group "${siteGroupCode}"`;
                            errors.push(`${prefix}: ${msg}`);
                            addErrorToRows(raw.rowNumbers, msg);
                            continue;
                        }
                    }

                    resolvedStores.push({
                        id: matchedStore.id,
                        store_code: matchedStore.store_code,
                        name: matchedStore.name,
                        channel_id: matchedStore.channel_id,
                    });
                }
                return { siteGroup, stores: resolvedStores };
            });
            return { id: batch.id, maxScan: batch.maxScan, groups: resolvedGroups };
        });

        // 9. Object Cleaning: Remove internal "raw" helper fields before pushing to payloads
        const { 
            batchMap: _bm, ocrApiName: _an, moduleInventory: _mi, 
            moduleNearExpiry: _mne, moduleOsa: _mo, moduleShareOfShelf: _ms, 
            batches: _b, rowNumbers: _rn, emptyLocationRows: _el, 
            ...rest 
        } = raw as any;

        payloads.push({ ...rest, ocrApi, moduleCode, extendedModuleCodes, batches: resolvedBatches });
    }

    return { payloads, errors, rowErrorMap };
}

// ─── Template columns ─────────────────────────────────────────────────────────

const TEMPLATE_COLUMNS = [
    "OCR Code",
    "Name",
    "Description",
    "OCR API",
    "Module Code",
    "Site Group Code",
    "Store Code",
    "Max Scan",
];

// ─── Download template ────────────────────────────────────────────────────────

function downloadTemplate() {
    const link = document.createElement("a");
    link.href = "/templates/OCR_Mapping_Form.xlsx";
    link.download = "OCR_Mapping_Form.xlsx";
    link.click();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({
    children,
    variant = "default",
}: {
    children: React.ReactNode;
    variant?: "default" | "blue" | "green" | "amber" | "red";
}) {
    const styles: Record<string, string> = {
        default: "bg-gray-100 text-gray-700",
        blue: "bg-blue-50 text-blue-700",
        green: "bg-green-50 text-green-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
            {children}
        </span>
    );
}

function DropZone({
    onFile,
    disabled,
    fileName,
}: {
    onFile: (f: File) => void;
    disabled?: boolean;
    fileName: string | null;
}) {
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

// ─── Main component ───────────────────────────────────────────────────────────

interface OcrExcelUploaderProps {
    apiUrl?: string;
    onComplete?: (results: SendResult[]) => void;
}

export default function OcrExcelUploader({
    apiUrl = "/api/ocr-setup",
    onComplete,
}: OcrExcelUploaderProps) {
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

    const [rawPayloads, setRawPayloads] = useState<RawPayload[] | null>(null);
    const [payloads, setPayloads] = useState<OcrPayload[] | null>(null);
    const [resolveErrors, setResolveErrors] = useState<string[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rowCount, setRowCount] = useState(0);
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState<SendResult[] | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [allRawRows, setAllRawRows] = useState<any[][]>([]);
    const [rowErrorMap, setRowErrorMap] = useState<Record<number, string[]>>({});
    const [originalWorkbook, setOriginalWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    useEffect(() => {
        if (!rawPayloads) return;
        const { 
            payloads: resolved, 
            errors, 
            rowErrorMap: errorsMap
        } = resolvePayloads(
            rawPayloads, 
            appOcrApi, 
            appModule, 
            appModuleExtended, 
            channels, 
            stores
        );
        setPayloads(resolved);
        setResolveErrors(errors);
        setRowErrorMap(errorsMap);
    }, [rawPayloads, appOcrApi, appModule, appModuleExtended, channels, stores]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (sending) {
            const start = performance.now();
            interval = setInterval(() => {
                setDuration(performance.now() - start);
            }, 100); // Update every 100ms for a "live" feel
        }
        return () => clearInterval(interval);
    }, [sending]);

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
                setOriginalWorkbook(wb);

                const targetSheet = "OCR Mapping";
                const ws = wb.Sheets[targetSheet];

                if (!ws) {
                    setParseError(`Sheet "${targetSheet}" not found. Please use the correct template.`);
                    return;
                }

                const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

                setAllRawRows(allRows);

                const mainHeaders = allRows[0] as string[];
                const subHeaderRow = allRows[3] as string[]; 
                const dataRows = allRows.slice(4);             

                const headers = mainHeaders.map((h, i) => {
                    const main = String(h || "").trim();
                    const sub = String(subHeaderRow[i] || "").trim();
                    
                    const finalHeader = sub || main; 

                    return finalHeader;
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
        if (!fileName) return;

        const arrayBuffer = await originalFile?.arrayBuffer();

        if (!arrayBuffer) {
            console.error("File content could not be read.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const ws = workbook.getWorksheet("OCR Mapping");
        if (!ws) return;

        const lastCol = ws.columnCount + 1;

        // Add header in Row 1
        const headerCell = ws.getRow(1).getCell(lastCol);
        headerCell.value = "Errors";
        headerCell.font = { bold: true };

        // Inject errors from rowErrorMap
        Object.entries(rowErrorMap).forEach(([rowNumStr, errorList]) => {
            const rowIdx = parseInt(rowNumStr);
            const cell = ws.getRow(rowIdx).getCell(lastCol);
            cell.value = errorList.join(" | ");
            cell.font = { color: { argb: "FFFF0000" }, bold: true };
        });

        // Auto-fit the error column width
        ws.getColumn(lastCol).width = 60;

        // Write and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Errors_${fileName}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSend = async () => {
        if (!payloads) return;
        setSending(true);
        setResults(null);

        const startTime = performance.now();
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

    const reset = () => {
        setOriginalFile(null);ƒall
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
                    {/* {resolveErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600">✕ {e}</p>
                    ))} */}
                </div>
            )}

            {payloads && (
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="blue">{rowCount} rows</Badge>
                        {resolveErrors.length > 0 && (
                            <Badge variant="red">{resolveErrors.length} error{resolveErrors.length !== 1 ? "s" : ""}</Badge>
                        )}
                        {results && successCount > 0 && <Badge variant="green">✓ {successCount} sent</Badge>}
                        {results && failCount > 0 && <Badge variant="red">{failCount} failed</Badge>}
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