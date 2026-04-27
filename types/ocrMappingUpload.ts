import { AppModule, AppOcrApi, AppRegion, AppStoreChannel, AppStoreGroup, AppStoreType } from "./ocrTemplate";

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

export interface SendResult {
    payload: OcrPayload;
    status: "success" | "error";
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