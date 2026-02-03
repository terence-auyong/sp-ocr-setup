type InventoryProps = {
    selectedInventoryGroup: InventoryGroup | null;
    handleCheckboxChange: (key: string, checked: boolean, config_codes: string) => void;
    handleOcrCodeChange: (key: string, value: string, config_codes: string) => void;
    handleInvScript: () => void;
    results: InventoryGroupWithAreasAndConfig[];
    areaData: AreaDataState;
}

const Inventory = ({
    selectedInventoryGroup,
    handleCheckboxChange,
    handleOcrCodeChange,
    handleInvScript,
    results,
    areaData
}: InventoryProps) => {
    const selectedItem = results.filter(res => res.inventory_group_code === selectedInventoryGroup?.inventory_group_code);

    return (
        <div className='flex flex-col w-160 bg-[#F5F5F5] p-4 rounded-lg'>
            {!selectedInventoryGroup ? (
                <div className='flex justify-center items-center w-full h-full'>
                    No Item Selected
                </div>
            ) : (
                <div className='w-full'>
                    <div className='h-16 mb-4'>
                        <p>Inventory Area</p>
                        <p className='text-2xl font-bold'>
                            {selectedInventoryGroup?.inventory_group_code}
                        </p>
                    </div>
                    <div className='h-80 w-full overflow-auto'>
                        <div className='flex space-evenly w-full'>
                            <div className='flex-1 flex justify-center items-center font-semibold'>Code</div>
                            <div className='flex-1 flex justify-center items-center font-semibold'>OCR Area</div>
                            <div className='flex-1 flex justify-center items-center font-semibold'>OCR Code</div>
                        </div>
                        <div className='flex flex-col gap-0.5 bg-gray-300 overflow-auto'>
                            {selectedItem
                                .flatMap((res) => res.areas)
                                .length === 0 ? (
                                    <div className='flex justify-center items-center h-full w-full bg-[#F1F1F1] p-8'>
                                        No available areas
                                    </div>
                                ) : (
                                    selectedItem
                                        .flatMap((res) => 
                                            res.areas.map((area) => {
                                                const key = `${res.inventory_group_code}-${area.inventory_area}`;
                                                return (
                                                    <div key={key} className='flex space-evenly h-16 w-full bg-[#F5F5F5]'>
                                                        <div className='flex-1 flex justify-center items-center bg-[#F5F5F5]'>
                                                            {area.inventory_area}
                                                        </div>
                                                        <div className='flex-1 flex justify-center items-center bg-[#F5F5F5]'>
                                                            <input 
                                                                type="checkbox" 
                                                                className='h-4 w-4'
                                                                checked={areaData[key]?.checked ?? false}
                                                                onChange={(e) => handleCheckboxChange(key, e.target.checked, area.config_codes)}
                                                            />
                                                        </div>
                                                        <div className='flex-1 flex justify-center items-center bg-[#F5F5F5]'>
                                                            <input
                                                                type="text"
                                                                className={`w-3/4 p-1 rounded 
                                                                    ${!areaData[key]?.checked ? "bg-gray-300 cursor-not-allowed" : "bg-gray-200"}
                                                                    ${areaData[key]?.error ? "border-2 border-red-400" : ""}
                                                                `}
                                                                disabled={!areaData[key]?.checked}
                                                                maxLength={3}
                                                                value={areaData[key]?.ocrCode ?? ""}
                                                                onChange={(e) => handleOcrCodeChange(key, e.target.value, area.config_codes)}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )
                                )
                            }
                        </div>
                    </div>
                    <div className='mt-2 w-full flex justify-end'>
                        <button 
                            className='h-12 w-32 font-semibold rounded-md button'
                            onClick={handleInvScript}
                        >
                            Generate
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Inventory;