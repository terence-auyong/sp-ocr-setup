import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "./MultiSelect";
import { fetchAppChannel } from "@/services/app-channel";
import { fetchAppStore } from "@/services/app-store";
import { BatchEntry } from "@/types/OcrTemplate";

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

    const otherBatches = existingRows.filter(b => b.id !== editingId);

    // Site Group mode: site groups are exclusive (used ones hidden)
    // Store mode: site groups are reusable, only stores are exclusive
    const usedSiteGroupIds = new Set(
        selectionType === 'siteGroup'
            ? otherBatches.flatMap(b => b.groups.map(g => g.siteGroup.id))
            : [] // site groups are reusable in store mode
    );

    const usedStoreIds = new Set(
        otherBatches.flatMap(b => b.groups.flatMap(g => g.stores.map(s => s.id)))
    );

    const availableChannels = channels.filter(c => !usedSiteGroupIds.has(c.id));

    // Whether "ALL SITE GROUPS" (id === 0) is selected
    const allSiteGroupsSelected = value.siteGroups.some(sg => sg.id === 0);

    // If all site groups selected → show every store (minus already used ones)
    // Otherwise → filter by selected site group channel_ids
    const availableStores = allSiteGroupsSelected
        ? stores.filter(s => !usedStoreIds.has(s.id))
        : stores.filter(s =>
            value.siteGroups.some(sg => sg.id === s.channel_id) &&
            !usedStoreIds.has(s.id)
        );

    const handleSiteGroupChange = (siteGroups: AppChannel[]) => {
        const isAllSelected = siteGroups.some(sg => sg.id === 0);

        if (isAllSelected) {
            // "All site groups" selected — clear stores so user picks from all
            onChange({ ...value, siteGroups, stores: [] });
            return;
        }

        // Normal case — drop stores that no longer belong to selected site groups
        const validIds = new Set(
            stores
                .filter(s => siteGroups.some(sg => sg.id === s.channel_id))
                .map(s => s.id)
        );
        onChange({ ...value, siteGroups, stores: value.stores.filter(s => validIds.has(s.id)) });
    };

    const storePickerDisabled = value.siteGroups.length === 0;
    const storePlaceholder = storePickerDisabled
        ? 'Select site groups first...'
        : allSiteGroupsSelected
            ? 'Select stores (all site groups)...'
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