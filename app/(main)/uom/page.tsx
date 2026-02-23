"use client"
import { useState } from "react";
import Spinner from "@/components/Spinner";
import { fetchUom } from "@/services/uom";
import PreviewUom from "@/components/PreviewUom";
import { useQuery } from "@tanstack/react-query";

const UomOcr = () => {
	const [searchTerm, setSearchTerm] = useState(""); 

	const {
		data: uom = [],
		isLoading: loadingUom,
		refetch
	} = useQuery<Uom[]>({
		queryKey: ['uom'],
		queryFn: fetchUom,
	});

	const [selectedUom, setSelectedUom] = useState<Uom | null>(null);
	const [uomOcrError, setUomOcrError] = useState(false);
	const [uomDuplicateError, setUomDuplicateError] = useState(false);

	const [showPreview, setShowPreview] = useState(false);

	const handleUomOcrCodeChange = (newCode: string) => {
		if (!selectedUom) return;

		setSelectedUom({ ...selectedUom, ocr_code: newCode });

		if (newCode.trim() !== "") {
			setUomOcrError(false);
			setUomDuplicateError(false); 
		}
	};

	const filteredItems = uom?.filter(item =>
        item.long_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

	const handleSubmit = () => {
		if (!selectedUom?.ocr_code || selectedUom.ocr_code.trim() === "") {
			setUomOcrError(true);
			return;
		}

		const original = uom.find(u => u.id === selectedUom.id);

		if (original?.ocr_code === selectedUom.ocr_code.trim()) {
			alert("No changes detected.");
			return;
		}

		const isDuplicate = uom.some(
			u => u.id !== selectedUom.id && u.ocr_code.toLowerCase() === selectedUom.ocr_code.trim().toLowerCase()
		);

		if (isDuplicate) {
			setUomOcrError(true); 
    		setUomDuplicateError(true);
			alert("This OCR code is already used by another unit of measure.");
			return;
		}

		setUomOcrError(false);
		setShowPreview(true);
	};

  return (
    <div className="flex gap-4 h-224 w-320 rounded border-b border-gray-300 bg-[#FAFAFA] p-4">
            {showPreview && (
                <PreviewUom 
                    onClose={() => setShowPreview(false)}
                    selectedUom={selectedUom}
					refetch={refetch}
                />
            )}
		<div className="h-full flex flex-col">
			<input 
				type="text" 
				placeholder="Search..." 
				className="h-12 w-64 mb-4 bg-gray-200 p-2 rounded" 
				onChange={(e) => setSearchTerm(e.target.value)}
			/>
			<p className="text-gray-400 mb-2">{uom?.length} items</p>
			<div className="flex-1 overflow-auto relative">
				{loadingUom ? (
					<div className="flex justify-center items-center h-full w-full">
						<Spinner/>					
					</div>
				) : filteredItems.length > 0 ? (
						filteredItems.map((item) => (
							<div
								key={item.id}
								className={`flex justify-center items-center h-16 w-64 cursor-pointer rounded
								${selectedUom?.id === item.id ? "bg-blue-300 text-white font-bold" : "hover:bg-gray-200"}`}
								onClick={() => {
									setSelectedUom(item);
									setUomOcrError(false);
									setUomDuplicateError(false);
								}}
							>
								{item.long_name}
							</div>
						))
				) : (
					<div className="flex justify-center items-center h-full text-gray-400">
						No items found
					</div>
				)}
				</div>
		</div>
		<div className="h-full flex flex-col flex-1 rounded">
			{selectedUom ? (
				<div className='w-full'>
					<div className="mb-4">
						<p className="text-lg">Unit of Measure</p>
						<h1 className="font-bold text-2xl">
							{selectedUom.long_name}
						</h1>
					</div>
					<div className="border border-gray-300 rounded">
						<div>
							<table className="w-full">
								<thead>
									<tr className="h-12 border-b border-gray-300">
										<th className="w-1/3 text-center">Unit Of Measure</th>
										<th className="w-1/3 text-center">OCR Code</th>
									</tr>
								</thead>
							</table>
						</div>
						<div className="flex-1 overflow-auto">
							<table className="w-full">
								<tbody>
									<tr className="h-16 bg-[#FAFAFA] border-gray-300">
										<td className="w-1/3 text-center">
											{ selectedUom.long_name }
										</td>
										<td className="w-1/3 text-center">
											<input 
												type="text" 
												className={`w-40 p-1 rounded text-center bg-gray-200 
													${uomOcrError || uomDuplicateError ? "border-2 border-red-400" : ""}
												`}
												maxLength={2}
												value={selectedUom.ocr_code ?? ""}
												onChange={(e) => {
													const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
													handleUomOcrCodeChange?.(value);
												}} 
											/>
											{(uomOcrError || uomDuplicateError) &&
												<p className="text-red-500 text-xs mt-1 h-4">
													{uomDuplicateError ? "OCR code already in use" : "This field is required"}
												</p>
											}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
                    
					<div className="flex items-center justify-end pt-4 gap-4">
						<button 
							className="bg-blue-300 hover:bg-blue-400 w-40 h-12 rounded text-white font-bold"
							onClick={handleSubmit}
						>
							Submit
						</button>
					</div>
				</div>
            ) : (
                <div className="flex items-center justify-center text-xl text-gray-400 h-full w-full">
					No Item Selected
				</div>
			)}
		</div>
    </div>
  )
}

export default UomOcr;