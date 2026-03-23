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
    extendedModuleNames: string[];
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

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const excelRowNumber = i + 4;

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
                extendedModuleNames: String(r["Module Code"] ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
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

        // ── Both site group and store code are empty → error ──
        if (siteGroupCodes.length === 0 && storeCodes.length === 0) {
            tpl.emptyLocationRows.push(excelRowNumber);
            continue;
        }

        if (storeCodes.length > 0) {
            // Store present → always store-only group, site group is ignored
            const EMPTY_SITE_GROUP_KEY = "__NO_SITE_GROUP__";
            if (!batch.groupMap[EMPTY_SITE_GROUP_KEY]) {
                const group: RawGroup = { siteGroupCode: EMPTY_SITE_GROUP_KEY, storeCodes: [] };
                batch.groupMap[EMPTY_SITE_GROUP_KEY] = group;
                batch.groups.push(group);
            }
            const group = batch.groupMap[EMPTY_SITE_GROUP_KEY];
            for (const storeCode of storeCodes) {
                if (!group.storeCodes.includes(storeCode)) {
                    group.storeCodes.push(storeCode);
                }
            }
        } else {
            // No stores → site group only
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
    const payloads: OcrPayload[] = [];

    const ALLOWED_OCR_CODES = ["OCR Inside INV", "Multiple OCR Module"];
    const ALLOWED_OCR_APIS = ["analyze document", "detect text"];
    const MULTIPLE_OCR_ALLOWED = ["inventory", "near expiry", "osa", "share of shelf"];

    for (const raw of raws) {
        const label = raw.ocrName || raw.ocrCode;
        const rowLabel = raw.rowNumbers.length === 1
            ? `row ${raw.rowNumbers[0]}`
            : `rows ${raw.rowNumbers.join(", ")}`;
        const prefix = `[${rowLabel}] "${label}"`;

        for (const rowNum of raw.emptyLocationRows) {
            errors.push(`[row ${rowNum}] "${label}": Site Group Code or Store Code is required — at least one must be provided`);
        }
        
        // ── OCR Code must be one of the allowed values ──
        if (!ALLOWED_OCR_CODES.includes(raw.ocrCode)) {
            errors.push(`${prefix}: OCR Code "${raw.ocrCode}" is not valid. Allowed values: OCR Inside INV, Multiple OCR Module`);
        }

        if (!raw.ocrName) errors.push(`${prefix}: Name is empty`);
        if (!raw.batches.length) errors.push(`${prefix}: no batches found`);

        for (const batch of raw.batches) {
            if (!Number.isFinite(batch.maxScan) || batch.maxScan <= 0) {
                errors.push(`${prefix}: Max Scan must be a positive number (value: ${batch.maxScan})`);
            }
        }

        // ── OCR API (matched by name) ──
        const ocrApi = raw.ocrApiName
            ? (ocrApis.find((a) => a.name.toLowerCase() === raw.ocrApiName.toLowerCase()) ?? null)
            : null;
        if (raw.ocrApiName && !ALLOWED_OCR_APIS.includes(raw.ocrApiName.toLowerCase())) {
            errors.push(`${prefix}: OCR API "${raw.ocrApiName}" is not valid. Allowed values: Analyze Document, Detect Text`);
        } else if (raw.ocrApiName && !ocrApi) {
            errors.push(`${prefix}: OCR API "${raw.ocrApiName}" not found`);
        }

        // ── Module: auto-derived from OCR Code (hidden from user) ──
        const derivedModuleName = deriveModuleName(raw.ocrCode);
        const moduleCode = derivedModuleName
            ? (modules.find((m) => m.name === derivedModuleName) ?? null)
            : null;
        if (derivedModuleName && !moduleCode) {
            errors.push(`${prefix}: auto-derived module "${derivedModuleName}" not found in module list`);
        }

        // ── Extended modules: user fills "Module Code" column ──
        const extendedModuleCodes: AppModule[] = [];

        if (raw.ocrCode === "OCR Inside INV") {
            const names = raw.extendedModuleNames;
            if (names.length === 0) {
                errors.push(`${prefix}: Module Code is required. Allowed value: Inventory`);
            } else if (names.length !== 1 || names[0].toLowerCase() !== "inventory") {
                errors.push(`${prefix}: Module Code "${names.join(", ")}" is not valid for OCR Inside INV. Only allowed value: Inventory`);
            } else {
                const match = extModules.find((m) => m.name.toLowerCase() === "inventory");
                if (match) extendedModuleCodes.push(match);
                else errors.push(`${prefix}: "Inventory" not found in extended modules list`);
            }
        } else if (raw.ocrCode === "Multiple OCR Module") {
            if (!raw.extendedModuleNames.length) {
                errors.push(`${prefix}: At least one Module Code is required. Allowed values: Inventory, Near Expiry, OSA, Share of Shelf`);
            } else {
                for (const name of raw.extendedModuleNames) {
                    if (!MULTIPLE_OCR_ALLOWED.includes(name.toLowerCase())) {
                        errors.push(`${prefix}: Module Code "${name}" is not valid. Allowed values: Inventory, Near Expiry, OSA, Share of Shelf`);
                    } else {
                        const match = extModules.find((m) => m.name.toLowerCase() === name.toLowerCase());
                        if (match) extendedModuleCodes.push(match);
                        else errors.push(`${prefix}: "${name}" not found in extended modules list`);
                    }
                }
            }
        }

        // ── Batches: resolve Site Group Code → SiteGroup, Store Code → Store ──
        const resolvedBatches: Batch[] = raw.batches.map((batch) => {
            const resolvedGroups: Group[] = batch.groups.map((rawGroup) => {
                const { siteGroupCode } = rawGroup;

                const isNoSiteGroup = siteGroupCode === "__NO_SITE_GROUP__";

                const matchedChannel = isNoSiteGroup
                    ? null
                    : allChannels.find((c) => c?.code?.toLowerCase() === siteGroupCode?.toLowerCase());

                if (!isNoSiteGroup && !matchedChannel) {
                    errors.push(`${prefix}: Site Group Code "${siteGroupCode}" not found in site groups`);
                }

                const siteGroup: SiteGroup = matchedChannel
                    ? { id: matchedChannel.id, code: matchedChannel.code, name: matchedChannel.name }
                    : { id: 0, code: "", name: "" };

                const resolvedStores: Store[] = [];
                for (const storeCode of rawGroup.storeCodes) {
                    const matchedStore = allStores.find(
                        (s) => s.store_code.toLowerCase() === storeCode.toLowerCase()
                    );
                    if (matchedStore) {
                        resolvedStores.push({
                            id: matchedStore.id,
                            store_code: matchedStore.store_code,
                            name: matchedStore.name,
                            channel_id: matchedStore.channel_id,
                        });
                    } else {
                        errors.push(`${prefix}: Store Code "${storeCode}" not found in stores`);
                    }
                }

                return { siteGroup, stores: resolvedStores };
            });

            return { id: batch.id, maxScan: batch.maxScan, groups: resolvedGroups };
        });

        const { batchMap: _bm, ocrApiName: _an, extendedModuleNames: _en, batches: _b, rowNumbers: _rn, emptyLocationRows: _el, ...rest } = raw;
        payloads.push({ ...rest, ocrApi, moduleCode, extendedModuleCodes, batches: resolvedBatches });
    }

    return { payloads, errors };
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

    useEffect(() => {
        if (!rawPayloads) return;
        if (!appOcrApi.length && !appModule.length) return;

        const { payloads: resolved, errors } = resolvePayloads(
            rawPayloads,
            appOcrApi,
            appModule,
            appModuleExtended,
            channels,
            stores,
        );
        setPayloads(resolved);
        setResolveErrors(errors);
    }, [rawPayloads, appOcrApi, appModule, appModuleExtended, channels, stores]);

    const handleFile = useCallback((file: File) => {
        setFileName(file.name);
        setParseError(null);
        setPayloads(null);
        setRawPayloads(null);
        setResults(null);
        setResolveErrors([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target?.result, { type: "array" });
                const targetSheet = "OCR Mapping";
                const ws = wb.Sheets[targetSheet];
                if (!ws) {
                    setParseError(`Sheet "${targetSheet}" not found. Please use the correct template.`);
                    return;
                }
                const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

                // Row 1 = headers, rows 2–3 = instructions → skip
                const [headers, , , ...dataRows] = allRows;

                const rows = dataRows
                    .map((row) =>
                        (headers as string[]).reduce<Record<string, unknown>>((acc, key, i) => {
                            acc[key] = (row as unknown[])[i] ?? "";
                            return acc;
                        }, {})
                    )
                    .filter((row) => Object.values(row).some((v) => String(v).trim() !== ""));

                if (!rows.length) { setParseError("No data rows found in the sheet."); return; }

                const raws = rowsToRaw(rows);
                setRowCount(rows.length);
                setRawPayloads(raws);
            } catch (err) {
                setParseError(`Failed to parse file: ${(err as Error).message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

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

    const reset = () => {
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
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-red-700 mb-1">Error cannot proceed</p>
                    {resolveErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600">✕ {e}</p>
                    ))}
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