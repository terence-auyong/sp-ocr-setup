"use client"
import { useState, useEffect } from 'react'
import { fetchInventoryGroup, fetchInventoryArea, fetchConfigurationPerInv } from './services/inventory'
import { generateInvScript, generateUomScript } from './utils/scripts'
import Inventory from './components/Inventory'
import Uom from './components/Uom'
import { fetchUom } from './services/uom'
import { LuCopy } from 'react-icons/lu'

const page = () => {
	const [activeTab, setActiveTab] = useState<"inventory" | "uom">("inventory");

	// Lists of Items
	const [inventoryGroup, setInventoryGroup] = useState<InventoryGroup[]>([]);
	const [inventoryGroupArea, setInventoryGroupArea] = useState<InventoryGroupArea[]>([]);
	const [configPerInvArea, setConfigPerInvArea] = useState<ConfigPerInvArea[]>([]);
	const [uom, setUom] = useState<Uom[]>([]);
	
	// Selected Items
	const [selectedInventoryGroup, setSelectedInventoryGroup] = useState<InventoryGroup | null>(null);
	const [selectedUom, setSelectedUom] = useState<Uom | null>(null);
	const [uomOcrError, setUomOcrError] = useState(false);

	const [areaData, setAreaData] = useState<AreaDataState>({});

	const [generatedScript, setGeneratedScript] = useState("");

	const [copied, setCopied] = useState(false);

	const mapGroupsWithAreasAndConfig = (
		groups: InventoryGroup[],
		groupAreas: InventoryGroupArea[],
		configs: ConfigPerInvArea[]
	): InventoryGroupWithAreasAndConfig[] => {
		const configMap = new Map<string, Map<string, string>>();
		
		for (const config of configs) {
			if (!configMap.has(config.inventory_group_code)) {
					configMap.set(config.inventory_group_code, new Map());
				}
			configMap.get(config.inventory_group_code)!.set(
				config.inventory_area, 
				config.config_codes
			);
		}

		const areaMap = new Map<string, string[]>();
		
		for (const { inventory_group_code, inventory_area } of groupAreas) {
			if (!areaMap.has(inventory_group_code)) {
			areaMap.set(inventory_group_code, []);
			}
			areaMap.get(inventory_group_code)!.push(inventory_area);
		}

		return groups.map((group) => {
			const groupCode = group.inventory_group_code;
			const areas = areaMap.get(groupCode) ?? [];
			
			const groupConfigs = configMap.get(groupCode) ?? new Map();
			const allConfigs = configMap.get('ALL') ?? new Map();

			return {
				...group,
				areas: areas.map(area => ({
					inventory_area: area,
					config_codes: groupConfigs.get(area) ?? allConfigs.get(area) ?? ''
				}))
			};
		});
	};

	const results: InventoryGroupWithAreasAndConfig[] = mapGroupsWithAreasAndConfig(
		inventoryGroup, 
		inventoryGroupArea, 
		configPerInvArea
	);

	const handleCheckboxChange = (key: string, checked: boolean, config_codes: string) => {
		setAreaData(prev => ({
			...prev,
			[key]: {
				checked: !(prev[key]?.checked ?? false),
				ocrCode: checked ? prev[key]?.ocrCode ?? "" : "",
				config_codes: config_codes
			}
		}));
	};

	const handleOcrCodeChange = (key: string, value: string, config_codes: string) => {
		setAreaData(prev => ({
			...prev,
			[key]: {
				checked: prev[key]?.checked ?? false,
				ocrCode: value,
				config_codes,
				error: false
			},
		}));
	};

	const handleInvScript = () => {
		if (!selectedInventoryGroup) {
			console.log("No inventory group selected");
			return;
		}

		let hasError = false;
		const updatedAreaData = { ...areaData }; 
		let scripts: string[] = [];

		for (const [key, value] of Object.entries(areaData)) {
			if (value.checked) {
				if (!value.ocrCode.trim()) {
					updatedAreaData[key] = { ...value, error: true };
					hasError = true;
					continue; 
				} else {
					updatedAreaData[key] = { ...value, error: false };
				}

				const script = generateInvScript(
					{ checked: value.checked, ocrCode: value.ocrCode, config_codes: value.config_codes },
					selectedInventoryGroup.inventory_group_code,
				);
				scripts.push(script);
			}
		}

		setAreaData(updatedAreaData);

		if (hasError) {
			alert("Please fill all OCR codes for checked rows.");
			return;
		}

		if (scripts.length === 0) {
			alert("No items have been updated.");
			return;
		}

		setGeneratedScript(scripts.join('\n\n'));
	};

	const handleUomOcrCodeChange = (newCode: string) => {
        if (!selectedUom) return;
        setSelectedUom({
            ...selectedUom,
            ocr_code: newCode
        });
    }

	const handleUomScript = () => {
		if (!selectedUom?.ocr_code || selectedUom.ocr_code.trim() === "") {
			setUomOcrError(true);
			alert("OCR Code cannot be empty");
			return;
		}
		const script = generateUomScript(selectedUom);
		setUomOcrError(false);
		setGeneratedScript(script);
	}

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(generatedScript);
			setCopied(true);
			setTimeout(() => {
				setCopied(false)
			}, 3000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	useEffect(() => {
		Promise.all([
			fetchInventoryGroup(),
			fetchInventoryArea(),
			fetchConfigurationPerInv(),
			fetchUom()
		]).then(([groups, areas, configs, uomData]) => {
			setInventoryGroup(groups);
			setInventoryGroupArea(areas);
			setConfigPerInvArea(configs);
			setUom(uomData);
		}).catch(console.error);
	}, []);

	useEffect(() => {
		setAreaData({});
		setGeneratedScript("");
		setUomOcrError(false);
	}, [selectedInventoryGroup, selectedUom]);

	return (
		<div className='flex items-center justify-center h-screen bg-gray-300'>
			<div className='flex gap-2 h-120 rounded-lg'>
				<div className="w-80 shrink-0 bg-[#F5F5F5] py-4 rounded-lg flex flex-col">	
					<div className="flex">
						<button
							className={`flex-1 py-2 text-center cursor-pointer ${
								activeTab === "inventory" ? "font-semibold border-b-2 border-blue-400" : ""
							}`}
							onClick={() => setActiveTab("inventory")}
						>
							Inventory
						</button>
						<button
							className={`flex-1 py-2 text-center cursor-pointer ${
								activeTab === "uom" ? "font-semibold border-b-2 border-blue-500" : ""
							}`}
							onClick={() => setActiveTab("uom")}
						>
							UOM
						</button>
					</div>
					<div className="overflow-auto mt-2">
						{activeTab === "inventory" &&
							inventoryGroup?.map((inv, index) => (
							<div
								key={inv.id}
								className={`h-16 w-full flex justify-center items-center hover:bg-gray-200 cursor-pointer ${
								selectedInventoryGroup?.id === inv.id ? "bg-gray-200 font-semibold" : ""
								}`}
								onClick={() => setSelectedInventoryGroup(inv)}
							>
								{inv.inventory_group_code}
							</div>
						))}
						{activeTab === "uom" &&
							uom.map((uom) => (
							<div
								key={uom.id}
								className={`h-16 w-full flex justify-center items-center hover:bg-gray-200 cursor-pointer ${
								selectedUom?.id === uom.id ? "bg-gray-200 font-semibold" : ""
								}`}
								onClick={() => setSelectedUom(uom)}
							>
								{uom.long_name}
							</div>
						))}
					</div>
				</div>
				{activeTab === "inventory" ? (
					<Inventory
						selectedInventoryGroup={selectedInventoryGroup}
						handleCheckboxChange={handleCheckboxChange}
						handleOcrCodeChange={handleOcrCodeChange}
						handleInvScript={handleInvScript}
						results={results}
						areaData={areaData}
					/>
				) : (
					<Uom
						selectedUom={selectedUom}
						handleUomScript={handleUomScript}
						onOcrCodeChange={handleUomOcrCodeChange}
						hasError={uomOcrError}
					/>
				)}
				<div className="bg-[#F1F1F1] p-4 rounded-lg h-full flex flex-col items-center gap-2">
					<div className='flex items-end justify-between w-full'>
						<p>Output:</p>
						<button 
							className={`rounded-md button ${ copied ? "p-1" : ""}`}
							onClick={handleCopy}
						>
							{ copied ? "Copied!" : <LuCopy className='m-2' size={16}/> }
						</button>
					</div>
					<textarea 
						className="flex-1 w-80 resize-none rounded-md p-2 bg-gray-200"
						value={generatedScript}
						readOnly
					/>
				</div>
			</div>
		</div>
	)
}

export default page