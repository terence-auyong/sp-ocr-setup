import { SiteGroupRow } from "@/types/OcrTemplate";

export function BatchesPreviewTable({ rows }: { rows: SiteGroupRow[] }) {
    if (rows.length === 0) {
        return <span className="text-gray-400 text-sm italic">No site groups configured</span>;
    }

    const hasStores = rows.some(r => r.stores.length > 0);

    return (
        <div className="rounded-lg border border-gray-200 overflow-hidden w-full">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                            Site Group
                        </th>
                        {hasStores && (
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                Stores
                            </th>
                        )}
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                            Max Scan
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50/60">
                            <td className="px-3 py-2">
                                <span className="inline-flex items-center bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded text-xs border border-indigo-100">
                                    {row.siteGroup.name}
                                </span>
                            </td>
                            {hasStores && (
                                <td className="px-3 py-2">
                                    {row.stores.length === 0 ? (
                                        <span className="text-gray-400 text-xs italic">—</span>
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
                            <td className="px-3 py-2 font-semibold text-gray-800">
                                {row.maxScan}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}