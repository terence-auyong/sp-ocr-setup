type UomProps = {
	selectedUom: Uom | null;
	handleUomScript: () => void;
    onOcrCodeChange: (ocr_code: string) => void;
    hasError?: boolean
}

const Uom = ({
	selectedUom,
	handleUomScript,
    onOcrCodeChange,
    hasError
}: UomProps) => {
	
    return (
        <div className='flex flex-col w-160 bg-[#F5F5F5] p-4 rounded-lg'>
			{!selectedUom ? (
                <div className='flex justify-center items-center w-full h-full'>
                    No Item Selected
                </div>
            ) : (
                <div className='w-full'>
                    <div className='h-16 mb-4'>
                        <p>Unit of Measure</p>
                        <p className='text-2xl font-bold'>
                            {selectedUom?.long_name}
                        </p>
                    </div>
					<div className='flex space-evenly h-80 w-full'>
                        <div className="flex flex-1 flex-col items-center">
							<div className="h-16 font-semibold">Long Name</div>
							<div className="h-16">{selectedUom.long_name}</div>
						</div>
						<div className="flex flex-1 flex-col items-center">
							<div className="h-16 font-semibold">OCR Code</div>
							<div className="h-16">
								<input 
									type="text" 
									className={`rounded p-1 text-center bg-gray-200 
                                        ${hasError ? "border-2 border-red-400" : "bg-gray-200"}`
                                    }
                                    maxLength={2}
									value={selectedUom.ocr_code ?? ""}
                                    onChange={(e) => onOcrCodeChange?.(e.target.value)} 
								/>
							</div>
						</div> 
                    </div>
					<div className='mt-2 w-full flex justify-end'>
                        <button 
                            className='h-12 w-32 font-semibold rounded-md button'
                            onClick={handleUomScript}
                        >
                            Generate
                        </button>
                    </div>
				</div>
			)}
		</div>
    )
}

export default Uom;