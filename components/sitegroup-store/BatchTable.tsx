import { AppStore, SiteGroupRow } from "@/types/OcrTemplate";

type EditFormState = {
    stores: AppStore[];
    maxScan: string;
}

export function BatchTable({
    rows,
    selectionType,
    editingId,
    onEdit,
    onDelete,
}: {
    rows: SiteGroupRow[];
    selectionType: 'siteGroup' | 'store';
    editingId: string | null;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    if (rows.length === 0) return null;

    return (
        <div className="h-80 rounded-xl border border-gray-200 overflow-hidden shadow-sm overflow-y-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 text-xs">
                            Site Group
                        </th>
                        {selectionType === 'store' && (
                            <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 text-xs">
                                Stores
                            </th>
                        )}
                        <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 text-xs">
                            Max Scan
                        </th>
                        <th className="px-4 py-3 w-24" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map(row => {
                        return (
                            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center bg-indigo-50 text-indigo-700 font-medium px-2.5 py-0.5 rounded-md text-xs border border-indigo-100">
                                        {row.siteGroup.name}
                                    </span>
                                </td>

                                {selectionType === 'store' && (
                                    <td className="px-4 py-3">
                                        {row.stores.length === 0 ? (
                                            <span className="text-gray-400 text-xs italic">No stores</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {row.stores.map(s => (
                                                    <span key={s.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200">
                                                        {s.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                )}

                                <td className="px-4 py-3">
                                    <span className="font-semibold text-gray-800">{row.maxScan}</span>
                                </td>

                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => onEdit(row.id)}
                                            title="Edit"
                                            disabled={!!editingId}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onDelete(row.id)}
                                            title="Delete"
                                            disabled={!!editingId}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}