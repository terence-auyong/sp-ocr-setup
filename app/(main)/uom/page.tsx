"use client";
import { useState, useEffect } from "react";
import Spinner from "@/components/common/Spinner";
import { fetchUom } from "@/services/uom";
import PreviewUom from "@/components/uom/PreviewUom";
import { useQuery } from "@tanstack/react-query";
import { LuSearch } from "react-icons/lu";

const UomOcr = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [editedUomList, setEditedUomList] = useState<Uom[]>([]);
    const [showPreview, setShowPreview] = useState(false);
	const [previewList, setPreviewList] = useState<Uom[]>([]);

    const { data: uom = [], isLoading: loadingUom, refetch } = useQuery<Uom[]>({
        queryKey: ['uom'],
        queryFn: fetchUom,
        staleTime: 0,
    });

    // Initialize local state when data loads
    useEffect(() => {
        if (uom.length > 0) {
            setEditedUomList(uom);
        }
    }, [uom]);

    const handleInputChange = (id: number, value: string) => {
        const sanitized = value.replace(/[^a-zA-Z0-9]/g, "");
        setEditedUomList(prev => prev.map(item => 
            item.id === id ? { ...item, ocr_code: sanitized } : item
        ));
    };

    const filteredItems = editedUomList.filter(item =>
        item.long_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = () => {
		const changedItems = editedUomList.filter((editedItem) => {
			const originalItem = uom.find((u) => u.id === editedItem.id);
			return (originalItem?.ocr_code ?? "") !== (editedItem.ocr_code ?? "");
		});

		if (changedItems.length === 0) {
			alert("No changes detected.");
			return;
		}

		setPreviewList(changedItems);
		setShowPreview(true);
	};

    const handleClear = () => {
        setEditedUomList(uom);
    };

    return (
        <div className="flex flex-col p-4 h-200 w-full max-w-5xl mx-auto bg-[#FAFAFA] rounded-sm shadow">
            {showPreview && (
                <PreviewUom 
                    onClose={() => setShowPreview(false)}
                    selectedUomList={previewList}
                    refetch={refetch}
                />
            )}

            <div className="flex justify-between items-center mb-4">
				<div>
					<p className="font-bold text-xl">Unit of Measure</p>
					<p className="text-gray-400">{filteredItems.length} items</p>
				</div>
                <div className="flex items-center bg-gray-100 rounded gap-2 pl-2">
                    <LuSearch size={20} color="gray"/>
                    <input 
                        type="text" 
                        placeholder="Search UOM..." 
                        className="h-12 w-64 rounded p-2 focus:outline-none" 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-auto flex-grow rounded">
                <table className="w-full text-left border-collapse table-fixed">
					<thead className="bg-gray-100 sticky top-0">
						<tr className="h-12">
							<th className="px-4 text-center">Long name</th>
                            <th className="px-4 text-center">Short name</th>
							<th className="px-4 text-center">OCR Code</th>
						</tr>
					</thead>
					<tbody>
						{loadingUom ? (
							<tr>
                                <td colSpan={3} className="h-64">
                                    <div className="flex justify-center items-center h-full">
                                        <Spinner />
                                    </div>
                                </td>
                            </tr>
						) : filteredItems.map((item, index) => (
                                <tr key={item.id} className="h-16 border-b border-gray-200 hover:bg-gray-100 cursor-pointer">
                                    <td className="px-4 font-medium text-center">{item.long_name}</td>
                                    <td className="px-4 font-medium text-center">{item.short_name}</td>
                                    <td className="px-4 text-center">
                                        <input 
                                            type="text" 
                                            className="w-32 p-1 text-center bg-white border border-gray-300 rounded focus:border-blue-400"
                                            maxLength={2}
                                            value={item.ocr_code ?? ""}
                                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                                        />
                                    </td>
                                </tr>
                                )
                            ) 
                        }
					</tbody>
				</table>
            </div>
            <div className="flex justify-end items-end pt-4 gap-4">
                <button 
                    className="bg-gray-200 hover:bg-gray-300 w-32 h-12 rounded"
                    onClick={handleClear}
                >
                    Clear
                </button>
                <button 
                    className="bg-blue-300 hover:bg-blue-400 w-32 h-12 rounded text-white font-bold"
                    onClick={handleSubmit}
                >
                    Submit
                </button>
            </div>
        </div>
    );
}

export default UomOcr;