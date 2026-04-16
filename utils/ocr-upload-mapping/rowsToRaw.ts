import { formatDate } from "./formatDate";

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

export const rowsToRaw = (rows: Record<string, unknown>[]): RawPayload[] => {
    const byTemplate: Record<string, RawPayload> = {};
    let batchCounter = 0;

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
                moduleInventory: String(r["Inventory"] ?? "").trim(),
                moduleNearExpiry: String(r["Near Expiry"] ?? "").trim(),
                moduleOsa: String(r["OSA"] ?? "").trim(),
                moduleShareOfShelf: String(r["Share of Shelf"] ?? "").trim(),
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
        const startDate = formatDate(r["Start Date"]);
        const endDate = formatDate(r["End Date"]);
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
                rowNumber: excelRowNumber,
                moduleInventory: String(r["Inventory"] ?? "").trim(),
                moduleNearExpiry: String(r["Near Expiry"] ?? "").trim(),
                moduleOsa: String(r["OSA"] ?? "").trim(),
                moduleShareOfShelf: String(r["Share of Shelf"] ?? "").trim(),
            };
            batch.groupMap[groupKey] = group;
            batch.groups.push(group);
        }
    }

    return Object.values(byTemplate);
}