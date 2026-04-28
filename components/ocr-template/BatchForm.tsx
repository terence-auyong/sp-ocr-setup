import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "./MultiSelect";
import { fetchAppChannel } from "@/services/app-channel";
import { fetchAppStore } from "@/services/app-store";
import { BatchEntry } from "@/types/ocrTemplate";

type AppStore = {
    id: number;
    store_code: string;
    name: string;
    channel_id: number;
}

type AppChannel = {
    id: number;
    code: string;
    name: string;
}

type BatchFormState = {
    siteGroups: AppChannel[];
    stores: AppStore[];
    maxScan: string;
}

export function BatchForm({
    value,
    onChange,
    onSubmit,
    onCancel,
    selectionType,
    errors,
    isEditing,
    existingRows,
    editingId,
}: {
    value: BatchFormState;
    onChange: (v: BatchFormState) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    selectionType: 'siteGroup' | 'store';
    errors: Partial<Record<keyof BatchFormState, string>>;
    isEditing: boolean;
    existingRows: BatchEntry[];
    editingId: string | null;
}) {
    const { data: channels = [], isLoading: channelsLoading } = useQuery<AppChannel[]>({
        queryKey: ['app-channels'],
        queryFn: fetchAppChannel,
    });

    const { data: stores = [], isLoading: storesLoading } = useQuery<AppStore[]>({
        queryKey: ['app-stores'],
        queryFn: fetchAppStore,
    });

    // When editing in store mode, siteGroups was not persisted (it was a filter UI).
    // Reconstruct it once channels data is available:
    // - If the batch was saved with siteGroup.id=0 AND stores span multiple channels
    //   → the user had selected "All Site Groups", restore that virtual item
    // - Otherwise → derive the specific channels from the saved stores' channel_ids
    useEffect(() => {
        if (
            selectionType !== 'store' ||
            !isEditing ||
            channels.length === 0 ||
            value.siteGroups.length !== 0
        ) return;

        // Find the saved group entry — in store mode there's always exactly one group
        const savedGroup = existingRows.find(b => b.id === editingId)?.groups[0];
        const wasAllSelected = savedGroup?.siteGroup.id === 0;

        if (wasAllSelected) {
            // Restore the virtual "All" item exactly as it was saved
            onChange({ ...value, siteGroups: [{ id: 0, code: 'ALL', name: 'All' }] });
        } else if (value.stores.length > 0) {
            // Restore the specific channels the stores belong to
            const channelIdsFromStores = new Set(value.stores.map(s => s.channel_id));
            const restored = channels.filter(c => channelIdsFromStores.has(c.id));
            if (restored.length > 0) {
                onChange({ ...value, siteGroups: restored });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channels, isEditing, selectionType]);

    const otherBatches = existingRows.filter(b => b.id !== editingId);

    // Site Group mode: site groups are the real value — used ones are hidden
    // Store mode: site group picker is just a filter UI — all channels always available
    const usedSiteGroupIds = new Set(
        selectionType === 'siteGroup'
            ? otherBatches.flatMap(b => b.groups.map(g => g.siteGroup.id))
            : []
    );

    // Store mode: stores are the real value — used ones are hidden across all batches
    // Site Group mode: no store picker, so this is unused
    // Exclude id=0 (virtual "ALL STORES" item) — it should never block real store options
    const usedStoreIds = new Set(
        selectionType === 'store'
            ? otherBatches.flatMap(b => b.groups.flatMap(g => g.stores.map(s => s.id))).filter(id => id !== 0)
            : []
    );

    // Build available channels:
    // - Exclude site groups used in OTHER batches (usedSiteGroupIds)
    // - Always re-include currently selected ones (in case they're virtual like id=0,
    //   or were previously filtered — ensures they appear in the dropdown when editing)
    const filteredChannels = channels.filter(c => !usedSiteGroupIds.has(c.id));
    const selectedNotInList = value.siteGroups.filter(
        sg => !filteredChannels.find(c => c.id === sg.id)
    );
    const availableChannels = [...filteredChannels, ...selectedNotInList];

    // Store mode filter logic:
    // - If "ALL SITE GROUPS" (id=0) selected → show all stores not yet used
    // - Otherwise → show stores belonging to selected site groups, not yet used
    const allSiteGroupsSelected = value.siteGroups.some(sg => sg.id === 0);

    // When editing in store mode with no site group filter active → show all stores
    const noSiteGroupFilter = value.siteGroups.length === 0;
    const filteredStores = allSiteGroupsSelected || (selectionType === 'store' && noSiteGroupFilter)
        ? stores.filter(s => !usedStoreIds.has(s.id))
        : stores.filter(s =>
            value.siteGroups.some(sg => sg.id === s.channel_id) &&
            !usedStoreIds.has(s.id)
        );
    // Always re-include currently selected stores (e.g. when editing — they belong to this
    // batch so they're excluded from usedStoreIds, but may be outside the current filter)
    const selectedStoresNotInList = value.stores.filter(
        s => !filteredStores.find(fs => fs.id === s.id)
    );
    const availableStores = [...filteredStores, ...selectedStoresNotInList];

    // In Store mode, site group picker is a filter — changing it only affects store list,
    // not the saved siteGroups value (which will be discarded in toBatchEntry anyway)
    const handleSiteGroupChange = (siteGroups: AppChannel[]) => {
        const isAllSelected = siteGroups.some(sg => sg.id === 0);
        if (isAllSelected) {
            // "All" selected — clear stores since prev stores were filtered to specific channels
            onChange({ ...value, siteGroups, stores: [] });
            return;
        }
        // Drop stores that no longer belong to the newly selected site groups
        const validIds = new Set(
            stores
                .filter(s => siteGroups.some(sg => sg.id === s.channel_id))
                .map(s => s.id)
        );
        onChange({ ...value, siteGroups, stores: value.stores.filter(s => validIds.has(s.id)) });
    };

    // In store mode when editing, siteGroups is empty (filter state is ephemeral).
    // Don't disable the store picker — show all stores so the user can still edit.
    const storePickerDisabled = selectionType === 'store' && isEditing
        ? false
        : value.siteGroups.length === 0;

    const storePlaceholder = storePickerDisabled
        ? 'Select site groups first...'
        : allSiteGroupsSelected
            ? 'Select stores (all site groups)...'
            : (selectionType === 'store' && isEditing && value.siteGroups.length === 0)
                ? 'Select stores (use site group filter above to narrow down)...'
                : 'Select stores...';

    return (
        <div className="transition-all duration-200">
            {isEditing && (
                <div className="pb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Editing batch</span>
                </div>
            )}
            <div className="space-y-8">
                {/* Site Group */}
                <div className="flex items-start gap-4">
                    <label className="pt-2 w-24 shrink-0">
                        Site Group<span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1">
                        <MultiSelect
                            items={availableChannels}
                            isLoading={channelsLoading}
                            selected={value.siteGroups}
                            onChange={handleSiteGroupChange}
                            placeholder="Select site groups..."
                            hasError={!!errors.siteGroups}
                            selectionType="siteGroup"
                        />
                        {errors.siteGroups && <p className="text-xs text-red-500 mt-1">{errors.siteGroups}</p>}
                    </div>
                </div>

                {/* Store */}
                {selectionType === 'store' && (
                    <div className="flex items-start gap-4">
                        <label className="pt-2 w-24 shrink-0">
                            Store<span className="text-red-500">*</span>
                        </label>
                        <div className="flex-1">
                            <MultiSelect
                                items={availableStores}
                                isLoading={storesLoading}
                                selected={value.stores}
                                onChange={s => onChange({ ...value, stores: s })}
                                placeholder={storePlaceholder}
                                hasError={!!errors.stores}
                                disabled={storePickerDisabled}
                                selectionType="store"
                            />
                            {errors.stores && <p className="text-xs text-red-500 mt-1">{errors.stores}</p>}
                        </div>
                    </div>
                )}

                {/* Max Scan */}
                <div className="flex items-start gap-4">
                    <label className="pt-2 w-24 shrink-0">
                        Max Scan<span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1">
                        <input
                            type="number"
                            min={1}
                            value={value.maxScan}
                            onChange={e => onChange({ ...value, maxScan: e.target.value })}
                            placeholder="Enter max scan"
                            className={`w-full px-3 py-2 rounded bg-gray-100 text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.maxScan ? 'border-red-400' : 'focus:border-blue-400 hover:border-blue-300'}`}
                        />
                        {errors.maxScan && <p className="text-xs text-red-500 mt-1">{errors.maxScan}</p>}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                    {onCancel && (
                        <button onClick={onCancel} className="px-4 py-2 text-sm rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onSubmit}
                        className="px-5 py-2 text-sm rounded font-semibold text-white bg-blue-300 hover:bg-blue-400 shadow-sm transition-all duration-150"
                    >
                        {isEditing ? 'Update batch' : '+ Add batch'}
                    </button>
                </div>
            </div>
        </div>
    );
}