"use client"
import { useEffect, useRef, useState } from 'react'
import Spinner from '@/components/Spinner';
import { fetchInventoryArea, fetchInventoryGroup } from '@/services/inventory';
import PreviewInventoryGroup from '@/components/PreviewInventoryGroup';
import { useQuery } from '@tanstack/react-query';

const page = () => {
    const [searchTerm, setSearchTerm] = useState(""); 

    const {
        data: inventoryGroup,
        isLoading: loadingGroups,
    } = useQuery({
        queryKey: ['inventoryGroup'],
        queryFn: fetchInventoryGroup,
    });

    const {
        data: inventoryGroupArea,
        isLoading: loadingAreas,
        refetch: refetchAreas
    } = useQuery({
        queryKey: ['inventoryArea'],
        queryFn: fetchInventoryArea,
    });

    const originalAreaData = useRef<AreaDataState>({});
	
    const [selectedInventoryGroup, setSelectedInventoryGroup] = useState<InventoryGroupWithAreasAndConfig | null>(null);
    const [areaData, setAreaData] = useState<AreaDataState>({});
    const [changedAreaData, setChangedAreaData] = useState<AreaDataState>({});
    const [showPreview, setShowPreview] = useState(false);

    const mapGroupsWithAreas = (
        groups: InventoryGroup[],
        groupAreas: InventoryGroupArea[],
    ): InventoryGroupWithAreasAndConfig[] => {
        const areaMap = new Map<string, InventoryGroupArea[]>();
        
        for (const area of groupAreas) {
            if (!areaMap.has(area.inventory_group_code)) {
                areaMap.set(area.inventory_group_code, []);
            }
            areaMap.get(area.inventory_group_code)!.push(area);
        }

        return groups.map((group) => ({
            ...group,
            areas: (areaMap.get(group.inventory_group_code) ?? []).map(area => ({
                inventory_area: area.inventory_area,
                ocr_area_status: area.ocr_area_status,
                ocr_code_status: area.ocr_code_status,
                ocr_code: area.ocr_code
            }))
        }));
    };

    const results: InventoryGroupWithAreasAndConfig[] = 
        !loadingGroups && !loadingAreas
            ? mapGroupsWithAreas(inventoryGroup, inventoryGroupArea)
            : [];
    
    const filteredItems = results.filter(item =>
        item.inventory_group_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Initialize areaData based on ocr_area_status when selectedInventoryGroup changes
    useEffect(() => {
        if (!selectedInventoryGroup) return;

        const initialAreaData: AreaDataState = {};
        selectedInventoryGroup.areas.forEach(area => {
            initialAreaData[area.inventory_area] = {
                checked: area.ocr_area_status === 1,
                ocrCode: area.ocr_code ?? "",
                ocr_area_status: area.ocr_area_status,
                ocr_code_status: area.ocr_code_status,
            };
        });

        setAreaData(initialAreaData);
        originalAreaData.current = initialAreaData; 
    }, [selectedInventoryGroup]);

    const handleCheckboxChange = (key: string, ocr_area_status: number, ocr_code_status: number) => {
        setAreaData(prev => ({
            ...prev,
            [key]: {
                checked: !(prev[key]?.checked ?? false),
                ocrCode: prev[key]?.ocrCode ?? "",
                ocr_area_status,
                ocr_code_status,
            }
        }));
    };

    const handleOcrCodeChange = (key: string, value: string, ocr_area_status: number, ocr_code_status: number) => {
        setAreaData(prev => ({
            ...prev,
            [key]: {
                checked: prev[key]?.checked ?? false,
                ocrCode: value,
                ocr_area_status,
                ocr_code_status,
                error: false,
                duplicate: false,
            },
        }));
    };

    const handlePreview = () => {
        if (!selectedInventoryGroup) return;

        const checkedAreas = Object.entries(areaData).filter(([_, value]) => value.checked);

        if (checkedAreas.length === 0) {
            alert("Please select at least one inventory area.");
            return;
        }

        let hasError = false;
        const updatedAreaData = { ...areaData };

        checkedAreas.forEach(([key, value]) => {
            if (!value.ocrCode || value.ocrCode.trim() === "") {
                updatedAreaData[key] = { ...value, error: true };
                hasError = true;
            }
        });

        setAreaData(updatedAreaData);
        if (hasError) return;

        const ocrCodes = checkedAreas.map(([_, value]) => value.ocrCode.trim());
        const hasDuplicates = ocrCodes.length !== new Set(ocrCodes).size;

        if (hasDuplicates) {
            const codeCount: Record<string, number> = {};
            ocrCodes.forEach(code => { codeCount[code] = (codeCount[code] || 0) + 1; });

            const duplicatedWithErrors = { ...areaData };
            checkedAreas.forEach(([key, value]) => {
                if (codeCount[value.ocrCode.trim()] > 1) {
                    duplicatedWithErrors[key] = { ...value, duplicate: true };
                }
            });
            setAreaData(duplicatedWithErrors);
            alert("Duplicate OCR codes detected. Each area must have a unique OCR code.");
            return;
        }

        const changed: AreaDataState = {};
        Object.entries(areaData).forEach(([key, value]) => {
            const original = originalAreaData.current[key];
            const hasChanged = 
                value.checked !== original?.checked ||
                value.ocrCode !== original?.ocrCode;

            if (hasChanged) {
                changed[key] = value;
            }
        });

        if (Object.keys(changed).length === 0) {
            alert("No changes detected.");
            return;
        }

        setChangedAreaData(changed);
        setShowPreview(true);
    };

    const handleSubmitSuccess = () => {
        originalAreaData.current = { ...areaData };
        refetchAreas();
    };

    const clearArea = () => {
        setAreaData({ ...originalAreaData.current });
    };

    return (
        <div className="flex flex-col gap-4 h-224 w-320 rounded border-b border-gray-300 bg-[#FAFAFA] p-4">
            {showPreview && (
                <PreviewInventoryGroup 
                    onClose={() => setShowPreview(false)}
                    areaData={changedAreaData} 
                    inventoryGroupCode={selectedInventoryGroup?.inventory_group_code || ""}
                    clearArea={clearArea}
                    onSubmitSuccess={handleSubmitSuccess}
                />
            )}
            <div className="flex flex-1 gap-4 overflow-hidden">
                <div className="h-full flex flex-col">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="h-12 w-64 mb-4 bg-gray-200 p-2 rounded" 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <p className="text-gray-400 mb-2">{results.length} items</p>
                    <div className="flex-1 overflow-auto relative">
                        {loadingGroups ? (
                            <div className="flex justify-center items-center h-full w-full">
                                <Spinner/>
                            </div>
                        ) : filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <div 
                                    key={item.id}  
                                    className={`flex justify-center items-center h-16 w-64 cursor-pointer rounded
                                        ${selectedInventoryGroup?.id === item.id ? "bg-blue-300 text-white font-bold" : "hover:bg-gray-200"}`}
                                    onClick={() => setSelectedInventoryGroup(item)}
                                >
                                    <span className="truncate w-full text-center">
                                        {item.inventory_group_code}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex justify-center items-center h-full text-gray-400">
                                No items found
                            </div>
                        )}
                    </div>
                </div>
                {!loadingAreas ? (
                    <div className="h-full flex flex-col flex-1 rounded">
                        {selectedInventoryGroup ? (
                            <div className="h-full flex flex-col">
                                <div className="mb-4">
                                    <p className="text-lg">Inventory Group</p>
                                    <h1 className="font-bold text-2xl">
                                        {selectedInventoryGroup?.inventory_group_code}
                                    </h1>
                                </div>
                                <div className="flex-1 flex flex-col min-h-0 border border-gray-300 rounded">
                                    <div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="h-12 border-b border-gray-300">
                                                    <th className="w-1/3 text-center">Inventory Area</th>
                                                    <th className="w-1/3 text-center">OCR Area</th>
                                                    <th className="w-1/3 text-center">OCR Code</th>
                                                </tr>
                                            </thead>
                                        </table>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full">
                                            <tbody>
                                                {selectedInventoryGroup.areas.length === 0 ? (
                                                    <tr>
                                                        <td className="flex items-center justify-center text-gray-400 text-lg mt-32">
                                                            No Inventory Areas Available
                                                        </td>                                               
                                                    </tr>
                                                ) : (
                                                    selectedInventoryGroup.areas.map((area) => { 
                                                        const key = area.inventory_area;
                                                        return (
                                                            <tr key={key} className="h-16 bg-[#FAFAFA] border-b border-gray-300">
                                                                <td className="w-1/3 text-center">
                                                                    {area.inventory_area}
                                                                </td>
                                                                <td className="w-1/3 text-center">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="h-4 w-4"
                                                                        checked={areaData[key]?.checked ?? false}
                                                                        onChange={() => handleCheckboxChange(key, area.ocr_area_status, area.ocr_code_status)}
                                                                    />
                                                                </td>
                                                                <td className="w-1/3 text-center">
                                                                    <input 
                                                                        type="text" 
                                                                        className={`w-40 p-1 rounded 
                                                                            ${!areaData[key]?.checked ? "bg-gray-300 cursor-not-allowed" : "bg-gray-200"}
                                                                            ${areaData[key]?.error || areaData[key]?.duplicate ? "border-2 border-red-400" : ""}
                                                                        `}
                                                                        disabled={!areaData[key]?.checked}
                                                                        maxLength={3}
                                                                        value={areaData[key]?.ocrCode ?? ""} 
                                                                        onChange={(e) => {
                                                                            const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                                                                            handleOcrCodeChange(key, value, area.ocr_area_status, area.ocr_code_status);
                                                                        }}
                                                                    />
                                                                    {areaData[key]?.error && (
                                                                        <p className="text-red-500 text-xs mt-1">
                                                                            This field is required
                                                                        </p>
                                                                    )}                                                                  
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end pt-4 gap-4">
                                    <button 
                                        className="bg-gray-200 hover:bg-gray-300 w-40 h-12 rounded"
                                        onClick={clearArea}
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        className="bg-blue-300 hover:bg-blue-400 w-40 h-12 rounded text-white font-bold"
                                        onClick={handlePreview}
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
                ) : (
                    <div className="flex justify-center items-center h-full w-full">
                        <Spinner />
                    </div>
                )}
            </div>
        </div>        
    )
}

export default page;