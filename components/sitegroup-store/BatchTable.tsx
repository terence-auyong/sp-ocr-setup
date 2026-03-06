import { SiteGroupRow } from "@/types/OcrTemplate";
import { Pen, Trash } from "lucide-react";

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
    return (
        <div className="h-120 overflow-hidden overflow-y-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-100 h-12">
                        <th className="rounded-tl rounded-bl text-left font-bold tracking-wider px-4 py-3">
                            Site Group
                        </th>
                        {selectionType === 'store' && (
                            <th className="text-left font-bold tracking-wider px-4 py-3">
                                Stores
                            </th>
                        )}
                        <th className="text-left font-bold tracking-wider px-4 py-3">
                            Max Scan
                        </th>
                        <th className="px-4 py-3 w-24 rounded-tr rounded-br" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {rows.length === 0 ? (
                        <tr>
                            <td 
                                colSpan={selectionType === 'store' ? 4 : 3} 
                                className="w-full text-center py-8 text-gray-400 text-lg"
                            >
                                No items added
                            </td>
                        </tr>
                    ) : (
                        rows.map(row => {
                            return (
                                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center bg-indigo-50 text-indigo-700 font-medium px-3 py-1 rounded-md border border-indigo-100">
                                            {row.siteGroup.name}
                                        </span>
                                    </td>

                                    {selectionType === 'store' && (
                                        <td className="px-4 py-3">
                                            {row.stores.length === 0 ? (
                                                <span className="text-gray-400 italic">No stores</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {row.stores.map(s => (
                                                        <span key={s.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                                            {s.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    )}

                                    <td className="px-4 py-3">
                                        <span>{row.maxScan}</span>
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => onEdit(row.id)}
                                                title="Edit"
                                                disabled={!!editingId}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Pen size={20}/>
                                            </button>
                                            <button
                                                onClick={() => onDelete(row.id)}
                                                title="Delete"
                                                disabled={!!editingId}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash size={20}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}