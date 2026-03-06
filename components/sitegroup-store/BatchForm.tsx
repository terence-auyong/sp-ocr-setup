import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "./MultiSelect";
import { fetchAppChannel } from "@/services/app-channel";
import { fetchAppStore } from "@/services/app-store";

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

export function BatchForm({ value, onChange, onSubmit, onCancel, selectionType, errors, isEditing }: {
    value: BatchFormState;
    onChange: (v: BatchFormState) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    selectionType: 'siteGroup' | 'store';
    errors: Partial<Record<keyof BatchFormState, string>>;
    isEditing: boolean;
}) {
    const { data: channels = [], isLoading: channelsLoading } = useQuery<AppChannel[]>({
        queryKey: ['app-channels'],
        queryFn: fetchAppChannel,
    });

    const { data: stores = [], isLoading: storesLoading } = useQuery<AppStore[]>({
        queryKey: ['app-stores'],
        queryFn: fetchAppStore,
    });

    // Only show stores belonging to the selected site groups
    const availableStores = stores.filter(s =>
        value.siteGroups.some(sg => sg.id === s.channel_id)
    );

    // When site groups change, drop stores that no longer belong
    const handleSiteGroupChange = (siteGroups: AppChannel[]) => {
        const validIds = new Set(stores.filter(s => siteGroups.some(sg => sg.id === s.channel_id)).map(s => s.id));
        onChange({ ...value, siteGroups, stores: value.stores.filter(s => validIds.has(s.id)) });
    };

    // Live preview of how stores will be grouped in the table
    // const preview = value.siteGroups.map(sg => ({
    //     siteGroup: sg,
    //     stores: value.stores.filter(s => s.channel_id === sg.id),
    // }));

    // const showPreview = selectionType === 'store' && value.siteGroups.length > 0 && value.stores.length > 0;

    return (
        <div className={`transition-all duration-200 ${isEditing ? '' : ''}`}>
            {isEditing && (
                <div className="px-4 pt-3 pb-0 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
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
                            items={channels}
                            isLoading={channelsLoading}
                            selected={value.siteGroups}
                            onChange={handleSiteGroupChange}
                            placeholder="Select site groups..."
                            hasError={!!errors.siteGroups}
                        />
                        {errors.siteGroups && <p className="text-xs text-red-500 mt-1">{errors.siteGroups}</p>}
                    </div>
                </div>

                {/* Store */}
                {selectionType === 'store' && (
                    <div className="flex items-start gap-4">
                        <label className="font-medium pt-2 w-24 shrink-0">
                            Store<span className="text-red-500">*</span>
                        </label>
                        <div className="flex-1">
                            <MultiSelect
                                items={availableStores}
                                isLoading={storesLoading}
                                selected={value.stores}
                                onChange={stores => onChange({ ...value, stores })}
                                placeholder={value.siteGroups.length === 0 ? 'Select site groups first...' : 'Select stores...'}
                                hasError={!!errors.stores}
                                disabled={value.siteGroups.length === 0}
                            />
                            {errors.stores && <p className="text-xs text-red-500 mt-1">{errors.stores}</p>}

                            {/* preview */}
                            {/* {showPreview && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                                    <p className="text-xs text-gray-400 font-medium mb-1">Preview grouping:</p>
                                    {preview.map(({ siteGroup, stores }) => (
                                        <div key={siteGroup.id} className="flex items-start gap-2 text-xs">
                                            <span className="font-semibold text-indigo-600 shrink-0 mt-0.5 w-20 truncate">{siteGroup.name}:</span>
                                            <span className="text-gray-600">
                                                {stores.length > 0
                                                    ? stores.map(s => s.name).join(', ')
                                                    : <span className="italic text-gray-400">no stores selected</span>
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )} */}
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
                        {isEditing ? 'Update item' : '+ Add item/s'}
                    </button>
                </div>
            </div>
        </div>
    );
}