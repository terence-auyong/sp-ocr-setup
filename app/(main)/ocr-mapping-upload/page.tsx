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
import ExcelJS from "exceljs";
import { AppModule, AppOcrApi, AppRegion, AppStoreChannel, AppStoreGroup, AppStoreType } from "@/types/OcrTemplate";
import DropZone from "@/components/ocr-mapping-upload/DropZone";
import Badge from "@/components/ocr-mapping-upload/Badge";

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

// ─── Raw parsed shape ─────────────────────────────────────────────────────────

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

const deriveModuleName = (ocrCode: string): string => {
    if (ocrCode === "OCR Inside INV") return "Inventory";
    if (ocrCode === "Multiple OCR Module") return "OCR";
    return "";
}

const formatExcelDate = (val: any): string | null => {
    if (val === undefined || val === null || String(val).trim() === "") return "";

    // 1. If it's already a JS Date object
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }

    // 2. If it's a Number (Excel Serial)
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean') {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }

    // 3. If it's a string, validate it strictly
    const dateAttempt = new Date(val);
    if (!isNaN(dateAttempt.getTime())) {
        return dateAttempt.toISOString().split('T')[0];
    }

    return null; 
};

// ─── Parser ───────────────────────────────────────────────────────────────────

const rowsToRaw = (rows: Record<string, unknown>[]): RawPayload[] => {
    const byTemplate: Record<string, RawPayload> = {};
    let batchCounter = 0;

    const isY = (val: unknown) => String(val ?? "").trim().toLowerCase() === "y";

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const excelRowNumber = i + 5;

        const code = String(r["OCR Code"] ?? "").trim();
        const name = String(r["Name"] ?? "").trim();
        const templateKey = code ? `${code}__${name}` : `INVALID_ROW_${excelRowNumber}`;

        if (!byTemplate[templateKey]) {
            byTemplate[templateKey] = {
                ocrCode: code, // This will be ""
                ocrName: name,
                description: String(r["Description"] ?? "").trim(),
                ocrApiName: String(r["OCR API"] ?? "").trim(),
                moduleInventory: isY(r["Inventory"]),
                moduleNearExpiry: isY(r["Near Expiry"]),
                moduleOsa: isY(r["OSA"]),
                moduleShareOfShelf: isY(r["Share of Shelf"]),
                batches: [],
                batchMap: {},
                rowNumbers: [excelRowNumber],
                emptyLocationRows: [],
            };
        } else {
            byTemplate[templateKey].rowNumbers.push(excelRowNumber);
        }

        if (!code) continue;

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

        const regionCode = String(r["Region Code"] ?? "").trim();
        const channelCode = String(r["Store Channel Code"] ?? "").trim();
        const siteGroupCode = String(r["Site Group Code"] ?? "").trim();
        const storeCode = String(r["Store Code"] ?? "").trim();
        const storeGroupCode = String(r["Store Group Code"] ?? "").trim();
        const storeTypeCode = String(r["Store Type Code"] ?? "").trim();
        const startDate = formatExcelDate(r["Start Date"]);
        const endDate = formatExcelDate(r["End Date"]);
        const isDelete = String(r["Delete"] ?? "").trim();

        if (!siteGroupCode && !storeCode) {
            tpl.emptyLocationRows.push(excelRowNumber);
            continue;
        }

        const groupKey = `row-${excelRowNumber}`;

        if (!batch.groupMap[groupKey]) {
            const group: RawGroup = {
                siteGroupCode,
                storeCode,
                regionCode,
                channelCode,
                storeGroupCode,
                storeTypeCode,
                startDate,  
                endDate,    
                isDelete, 
            };
            batch.groupMap[groupKey] = group;
            batch.groups.push(group);
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

const resolvePayloads = (
    raws: RawPayload[],
    ocrApis: AppOcrApi[],
    modules: AppModule[],
    extModules: AppModule[],
    allChannels: AppChannel[],
    allStores: AppStore[],
    allRegions: AppRegion[],
    allStoreChannels: AppStoreChannel[],
    allStoreGroups: AppStoreGroup[],
    allStoreTypes: AppStoreType[],
): ResolveResult => {
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

    const regionMap = new Map(
        allRegions.filter((r) => r?.code != null).map((r) => [r.code.toLowerCase(), r])
    );

    const storeChannelMap = new Map(
        allStoreChannels.filter((c) => c?.code != null).map((c) => [c.code.toLowerCase(), c])
    );

    const storeGroupMap = new Map(
        allStoreGroups.filter((g) => g?.code != null).map((g) => [g.code.toLowerCase(), g])
    );

    const storeTypeMap = new Map(
        allStoreTypes.filter((t) => t?.code != null).map((t) => [t.code.toLowerCase(), t])
    );

    const addErrorToRows = (rowNums: number[], msg: string) => {
        rowNums.forEach(num => {
            if (!rowErrorMap[num]) rowErrorMap[num] = [];
            
            if (!rowErrorMap[num].includes(msg)) {
                rowErrorMap[num].push(msg);
            }
        });
    };

    for (const raw of raws) {
        const label = raw.ocrName || raw.ocrCode;
        const rowLabel = raw.rowNumbers.length === 1
            ? `row ${raw.rowNumbers[0]}`
            : `rows ${raw.rowNumbers.join(", ")}`;
        const prefix = `[${rowLabel}] "${label}"`;

        // 1. Validate Location Rows
        for (const rowNum of raw.emptyLocationRows) {
            const msg = `Site Group Code or Store Code is required — at least one must be provided`;
            errors.push(`[row ${rowNum}] "${label}": ${msg}`);
            addErrorToRows([rowNum], msg);
        }

        if (!raw.ocrCode) {
            const msg = `OCR Code is required`;
            errors.push(`[row ${raw.rowNumbers[0]}] ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
            continue;
        }

        // 2. Validate OCR Code
        if (!ALLOWED_OCR_CODES.includes(raw.ocrCode)) {
            const msg = `OCR Code "${raw.ocrCode}" is not valid. Allowed: OCR Inside INV, Multiple OCR Module`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        // 3. Basic Field Validations
        if (!raw.ocrName) {
            const msg = "Name is required";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg);
        }

        if (!raw.description) {
            const msg = "Description is required";
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
        let apiErrorMsg = ""; 
        const ocrApiNameLower = raw.ocrApiName ? raw.ocrApiName.toLowerCase() : "";
        const ocrApi = ocrApiMap.get(ocrApiNameLower) ?? null;

        if (!raw.ocrApiName) {
            apiErrorMsg = "OCR API is required";
        } else if (!ALLOWED_OCR_APIS.includes(ocrApiNameLower) || !ocrApi) {
            apiErrorMsg = "OCR API is invalid";
        }

        if (apiErrorMsg) {
            errors.push(`${prefix}: ${apiErrorMsg}`);
            addErrorToRows(raw.rowNumbers, apiErrorMsg);
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
            // Check for invalid combinations first
            const invalidModules = [
                { key: "Near Expiry", flag: raw.moduleNearExpiry },
                { key: "OSA", flag: raw.moduleOsa },
                { key: "Share of Shelf", flag: raw.moduleShareOfShelf },
            ].filter(m => m.flag);

            if (invalidModules.length > 0) {
                const invalidNames = invalidModules.map(m => m.key).join(", ");
                const msg = `For "OCR Inside INV", only Inventory is allowed`;
                errors.push(`${prefix}: ${msg}`);
                addErrorToRows(raw.rowNumbers, msg);
            }

            // Standard Inventory requirement check
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
            // For Multiple OCR Module, any combination is fine as long as at least one is selected
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

        const resolvedBatches: Batch[] = raw.batches.map((batch) => {
            const resolvedGroups: Group[] = batch.groups.map((rawGroup) => {
                const { 
                    siteGroupCode, 
                    storeCode,
                    regionCode, 
                    channelCode, 
                    storeGroupCode, 
                    storeTypeCode,
                    startDate,
                    endDate,
                    isDelete 
                } = rawGroup;

                const getIDZero = <T extends { id: number }>(map: Map<string, T>): T => {
                    return Array.from(map.values()).find(item => item.id === 0) 
                        || ({ id: 0, code: "0", name: "Default" } as any);
                };

                // ── 1. Resolve Site Group ─────────────────────────────────────────────
                let siteGroup = getIDZero(channelMap);
                if (siteGroupCode) {
                    const found = channelMap.get(siteGroupCode.toLowerCase());
                    if (!found) {
                        const msg = `Site Group Code "${siteGroupCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg); 
                    } else {
                        siteGroup = found;
                    }
                }

                // ── 2. Resolve Region ─────────────────────────────────────────────────
                let region = getIDZero(regionMap);
                if (regionCode) {
                    const found = regionMap.get(regionCode.toLowerCase());
                    if (!found) {
                        const msg = `Region Code "${regionCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg); 
                    } else {
                        region = found;
                    }
                }

                // ── 3. Resolve Store Channel ──────────────────────────────────────────
                let storeChannel = getIDZero(storeChannelMap);
                if (channelCode) {
                    const found = storeChannelMap.get(channelCode.toLowerCase());
                    if (!found) {
                        const msg = `Store Channel Code "${channelCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg); 
                    } else {
                        storeChannel = found;
                        if (siteGroup.id > 0 && siteGroup.store_channel_id !== found.id) {
                            const msg = `Site Group "${siteGroup.code}" does not match Store Channel "${channelCode}"`;
                            errors.push(`${prefix}: ${msg}`);
                            addErrorToRows(raw.rowNumbers, msg);
                        }
                    }
                }

                // ── 4. Resolve Store Group ────────────────────────────────────────────
                let storeGroup = getIDZero(storeGroupMap);
                if (storeGroupCode) {
                    const found = storeGroupMap.get(storeGroupCode.toLowerCase());
                    if (!found) {
                        const msg = `Store Group Code "${storeGroupCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg); 
                    } else {
                        storeGroup = found;
                    }
                }

                // ── 5. Resolve Store Type ─────────────────────────────────────────────
                let storeType = getIDZero(storeTypeMap);
                if (storeTypeCode) {
                    const found = storeTypeMap.get(storeTypeCode.toLowerCase());
                    if (!found) {
                        const msg = `Store Type Code "${storeTypeCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg);
                    } else {
                        storeType = found;
                    }
                }

                // ── 6. Resolve Stores ─────────────────────────────────────────────────
                let store = getIDZero(storeMap);
                if (storeCode) {
                    const found = storeMap.get(storeCode.toLowerCase());
                    if (!found) {
                        const msg = `Store Code "${storeCode}" not found`;
                        errors.push(`${prefix}: ${msg}`);
                        addErrorToRows(raw.rowNumbers, msg);
                        store = { ...store, name: `Not Found: ${storeCode}` }; 
                    } else {
                        store = found;
                        
                        if (siteGroup.id > 0 && store.channel_id !== siteGroup.id) {
                            const msg = `Store "${storeCode}" belongs to a different Site Group`;
                            errors.push(`${prefix}: ${msg}`);
                            addErrorToRows(raw.rowNumbers, msg); 
                        }

                        if (storeType.id > 0 && store.store_type_id !== storeType.id) {
                            const msg = `Store type "${storeCode}" mismatch (expected Type ID: ${storeType.id})`;
                            errors.push(`${prefix}: ${msg}`);
                            addErrorToRows(raw.rowNumbers, msg);
                        }

                        if (storeGroup.id > 0 && store.store_group_id !== storeGroup.id) {
                            const msg = `Store group "${storeCode}" mismatch (expected Group ID: ${storeGroup.id})`;
                            errors.push(`${prefix}: ${msg}`);
                            addErrorToRows(raw.rowNumbers, msg); 
                        }
                    }
                }

                // ── 7. Dates ─────────────────────────────────────────────────
                if (!startDate && startDate !== "") { 
                    const msg = "Start Date is invalid";
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                } else if (startDate === "") {
                    const msg = "Start Date is required";
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                }

                if (endDate === null) {
                    const msg = "End Date is invalid";
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                }

                // ── 8. Delete ─────────────────────────────────────────────────
                const deleteVal = isDelete.trim().toUpperCase();
    
                if (deleteVal !== "Y" && deleteVal !== "") {
                    const msg = `Delete value is invalid`;
                    errors.push(`${prefix}: ${msg}`);
                    addErrorToRows(raw.rowNumbers, msg);
                }

                return { 
                    siteGroup, 
                    store, 
                    region, 
                    storeChannel, 
                    storeGroup, 
                    storeType,
                    startDate,
                    endDate,
                    isDelete: isDelete?.toUpperCase() === "Y" ? 0 : 1 
                };
            });

            return { id: batch.id, maxScan: batch.maxScan, groups: resolvedGroups };
        });

        // 9. Clean internal raw fields before pushing
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

// ─── Main component ───────────────────────────────────────────────────────────

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
    const [rowErrorMap, setRowErrorMap] = useState<Record<number, string[]>>({});
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

        // 1. Identify the column for Errors (one past the current last column)
        const lastColNumber = ws.actualColumnCount + 1;
        const errorCol = ws.getColumn(lastColNumber);
        errorCol.width = 60;

        // 2. Merge cells 1 through 4 for the Header
        // .mergeCells(top, left, bottom, right)
        ws.mergeCells(1, lastColNumber, 4, lastColNumber);

        // 3. Style the merged Header cell
        const headerCell = ws.getCell(1, lastColNumber);
        headerCell.value = "Errors";
        headerCell.font = { bold: true, size: 12 };
        headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
        headerCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '#ff0000' } // Optional: Yellow background to make it stand out
        };
        headerCell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        // 4. Populate row-specific errors starting from row 5
        Object.entries(rowErrorMap).forEach(([rowNumStr, errorList]) => {
            const rowIdx = parseInt(rowNumStr);
            const cell = ws.getRow(rowIdx).getCell(lastColNumber);
            
            cell.value = errorList.join(" | ");
            cell.font = { color: { argb: "FFFF0000" }, bold: true };
            cell.alignment = { wrapText: true };
            cell.border = {
                bottom: { style: 'thin' }
            };
        });

        // 5. Generate and download the file
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
                                {resolveErrors.length} error{resolveErrors.length !== 1 ? "s" : ""}
                            </Badge>
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

export default OcrExcelUploader;