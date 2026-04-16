import { AppModule, AppOcrApi, AppRegion, AppStoreChannel, AppStoreGroup, AppStoreType } from "@/types/OcrTemplate";

interface RowError {
    column: string;
    message: string;
}

interface ResolveResult {
    payloads: OcrPayload[];
    errors: string[];
    rowErrorMap: Record<number, RowError[]>;
}

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

const deriveModuleName = (ocrCode: string): string => {
    if (ocrCode === "OCR Inside INV") return "Inventory";
    if (ocrCode === "Multiple OCR Module") return "OCR";
    return "";
}

export const resolvePayloads = (
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
    let hasAnyError = false;
    const rowErrorMap: Record<number, RowError[]> = {};
    const payloads: OcrPayload[] = [];

    const ALLOWED_OCR_CODES = ["OCR Inside INV", "Multiple OCR Module"];
    const ALLOWED_OCR_APIS = ["analyze document", "detect text"];

    const ocrApiMap = new Map(ocrApis.map((a) => [a.name.toLowerCase(), a]));
    const moduleMap = new Map(modules.map((m) => [m.name.toLowerCase(), m]));
    const extModulesMap = new Map(extModules.map((m) => [m.name.toLowerCase(), m]));

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

    const addErrorToRows = (rowNums: number[], msg: string, column: string = "") => {
        rowNums.forEach(num => {
            if (!rowErrorMap[num]) rowErrorMap[num] = [];
            if (!rowErrorMap[num].some(e => e.message === msg)) {
                rowErrorMap[num].push({ column, message: msg });
            }
        });
    };

    const isTrue = (val: string) => val?.trim().toUpperCase() === 'Y';
    const isValidYN = (val: string) => {
        const v = val?.trim().toUpperCase();
        return v === 'Y' || v === 'N';
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
            addErrorToRows([rowNum], msg, "site group code");
        }

        if (!raw.ocrCode) {
            const msg = `OCR Code is required`;
            errors.push(`[row ${raw.rowNumbers[0]}] ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "ocr code");
            continue;
        }

        // 2. Validate OCR Code
        if (!ALLOWED_OCR_CODES.includes(raw.ocrCode)) {
            const msg = `Invalid value (OCR Code)`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "ocr code");
        }

        // 3. Basic Field Validations
        if (!raw.ocrName) {
            const msg = "Name is required";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "name");
        }

        if (!raw.description) {
            const msg = "Description is required";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "description");
        }

        if (!raw.batches.length) {
            const msg = "No batches found";
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "");
        }

        // 4. Max Scan Validation
        for (const batch of raw.batches) {
            if (!Number.isFinite(batch.maxScan) || batch.maxScan <= 0) {
                const msg = `Max Scan must be a positive number (value: ${batch.maxScan})`;
                errors.push(`${prefix}: ${msg}`);
                addErrorToRows(raw.rowNumbers, msg, "");
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
            addErrorToRows(raw.rowNumbers, apiErrorMsg, "ocr api");
        }

        // 6. Module Resolution (Auto-derived)
        const derivedModuleName = deriveModuleName(raw.ocrCode);
        const moduleCode = derivedModuleName
            ? (moduleMap.get(derivedModuleName.toLowerCase()) ?? null)
            : null;

        if (derivedModuleName && !moduleCode) {
            const msg = `Auto-derived module "${derivedModuleName}" not found in list`;
            errors.push(`${prefix}: ${msg}`);
            addErrorToRows(raw.rowNumbers, msg, "");
        }

        // 7. Extended Modules (Y/N Flags)
        const extendedModuleCodes: AppModule[] = [];

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

                const currentRow = [rawGroup.rowNumber];

                const moduleFlags = [
                    { name: "Inventory", val: rawGroup.moduleInventory, column: "inventory" },
                    { name: "Near Expiry", val: rawGroup.moduleNearExpiry, column: "near expiry" },
                    { name: "OSA", val: rawGroup.moduleOsa, column: "osa" },
                    { name: "Share of Shelf", val: rawGroup.moduleShareOfShelf, column: "share of shelf" },
                ];

                // Validate Y/N for THIS row only
                let rowHasFormatError = false;
                moduleFlags.forEach(flag => {
                    if (!isValidYN(flag.val)) {
                        const msg = `"${flag.name}" must be 'Y' or 'N'`;
                        addErrorToRows(currentRow, msg, flag.column);
                        errors.push(`Row ${rawGroup.rowNumber}: ${msg}`); // Add this
                        rowHasFormatError = true;
                        hasAnyError = true; // Add this
                    }
                });

                if (!rowHasFormatError) {
                    if (raw.ocrCode === "OCR Inside INV") {
                    const invalidModules = moduleFlags.filter(m => m.name !== "Inventory" && isTrue(m.val));
                    if (invalidModules.length > 0) {
                        const msg = `Only Inventory is allowed for OCR Inside INV.`; // Improved message
                        
                        // 1. Mark cells for Excel highlighting
                        invalidModules.forEach(m => addErrorToRows(currentRow, msg, m.column));
                        
                        // 2. ADD THIS: Tell the UI that an error exists!
                        errors.push(`Row ${rawGroup.rowNumber}: ${msg}`);
                        
                        // 3. Set the global flag
                        hasAnyError = true;
                    }
                    
                    // Check if Inventory is missing
                    if (isValidYN(rawGroup.moduleInventory) && !isTrue(rawGroup.moduleInventory)) {
                        const msg = "Inventory is required for OCR Inside INV.";
                        addErrorToRows(currentRow, msg, "inventory");
                        errors.push(`Row ${rawGroup.rowNumber}: ${msg}`); // Push here too
                        hasAnyError = true;
                    }
                }

                    if (raw.ocrCode === "Multiple OCR Module") {
                        const selected = moduleFlags.filter(m => isTrue(m.val));
                        if (selected.length === 0) {
                            const msg = "At least one module must be 'Y' for Multiple OCR Module.";
                            // Highlight all 4 module columns so the user knows where to act
                            moduleFlags.forEach(m => addErrorToRows(currentRow, msg, m.column));
                        }
                    }
                }

                const getIDZero = <T extends { id: number }>(map: Map<string, T>): T => {
                    return Array.from(map.values()).find(item => item.id === 0)
                        || ({ id: 0, code: "0", name: "Default" } as any);
                };

                // ── 1. Resolve Site Group ─────────────────────────────────────────────
                let siteGroup = getIDZero(channelMap);
                if (siteGroupCode) {
                    const found = channelMap.get(siteGroupCode.toLowerCase());
                    if (!found) {
                        const msg = `Invalid value (Site Group Code).`;
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "site group code");
                    } else {
                        siteGroup = found;
                    }
                }

                // ── 2. Resolve Region ─────────────────────────────────────────────────
                let region = getIDZero(regionMap);
                if (regionCode) {
                    const found = regionMap.get(regionCode.toLowerCase());
                    if (!found) {
                        const msg = `Invalid value (Region Code).`;
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "region code");
                    } else {
                        region = found;
                    }
                }

                // ── 3. Resolve Store Channel ──────────────────────────────────────────
                let storeChannel = getIDZero(storeChannelMap);
                if (channelCode) {
                    const found = storeChannelMap.get(channelCode.toLowerCase());
                    if (!found) {
                        const msg = `Invalid value (Channel Code).`;
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "store channel code");
                    } else {
                        storeChannel = found;
                        if (siteGroup.id > 0 && siteGroup.store_channel_id !== found.id) {
                            const msg = `Not assigned to Channel (Site Group).`;
                            errors.push(`${rawGroup.rowNumber}: ${msg}`);
                            addErrorToRows(currentRow, msg, "store channel code");
                        }
                    }
                }

                // ── 4. Resolve Store Group ────────────────────────────────────────────
                let storeGroup = getIDZero(storeGroupMap);
                if (storeGroupCode) {
                    const found = storeGroupMap.get(storeGroupCode.toLowerCase());
                    if (!found) {
                        const msg = `Invalid value (Store Group Code).`;
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "store group code");
                    } else {
                        storeGroup = found;
                    }
                }

                // ── 5. Resolve Store Type ─────────────────────────────────────────────
                let storeType = getIDZero(storeTypeMap);
                if (storeTypeCode) {
                    const found = storeTypeMap.get(storeTypeCode.toLowerCase());
                    if (!found) {
                        const msg = `Invalid value (Store Type Code).`;
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "store type code");
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
                        errors.push(`${rawGroup.rowNumber}: ${msg}`);
                        addErrorToRows(currentRow, msg, "store code");
                        store = { ...store, name: `Not Found: ${storeCode}` };
                    } else {
                        store = found;

                        if (siteGroup.id > 0 && store.channel_id !== siteGroup.id) {
                            const msg = `Not assigned to Site Group (Store Code).`;
                            errors.push(`${rawGroup.rowNumber}: ${msg}`);
                            addErrorToRows(currentRow, msg, "store code");
                        }

                        if (storeType.id > 0 && store.store_type_id !== storeType.id) {
                            const msg = `Not assigned to Store (Store Type Code).`;
                            errors.push(`${rawGroup.rowNumber}: ${msg}`);
                            addErrorToRows(currentRow, msg, "store code");
                        }

                        if (storeGroup.id > 0 && store.store_group_id !== storeGroup.id) {
                            const msg = `Not assigned to Store (Store Group Code).`;
                            errors.push(`${rawGroup.rowNumber}: ${msg}`);
                            addErrorToRows(currentRow, msg, "store code");
                        }
                    }
                }

                // ── 7. Dates ─────────────────────────────────────────────────
                if (!startDate && startDate !== "") {
                    const msg = "Invalid value (Start Date).";
                    errors.push(`${rawGroup.rowNumber}: ${msg}`);
                    addErrorToRows(currentRow, msg, "start date");
                } else if (startDate === "") {
                    const msg = "Missing required value (Start Date). ";
                    errors.push(`${rawGroup.rowNumber}: ${msg}`);
                    addErrorToRows(currentRow, msg, "start date");
                }

                if (endDate === null) {
                    const msg = "Invalid value (End Date).";
                    errors.push(`${rawGroup.rowNumber}: ${msg}`);
                    addErrorToRows(currentRow, msg, "end date");
                }

                // ── 8. Delete ─────────────────────────────────────────────────
                const deleteVal = isDelete.trim().toUpperCase();
                if (deleteVal !== "Y" && deleteVal !== "") {
                    const msg = `Invalid value (Delete).`;
                    errors.push(`${rawGroup.rowNumber}: ${msg}`);
                    addErrorToRows(currentRow, msg, "delete");
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

        const moduleFlags = [
            { name: "Inventory", isSelected: isTrue(raw.moduleInventory) },
            { name: "Near Expiry", isSelected: isTrue(raw.moduleNearExpiry) },
            { name: "OSA", isSelected: isTrue(raw.moduleOsa) },
            { name: "Share of Shelf", isSelected: isTrue(raw.moduleShareOfShelf) },
        ];

        moduleFlags.forEach(flag => {
            if (flag.isSelected) {
                const found = extModules.find(m => m.name.toLowerCase() === flag.name.toLowerCase());
                if (found) {
                    extendedModuleCodes.push(found);
                }
            }
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