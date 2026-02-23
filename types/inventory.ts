type InventoryGroup = {
	id: number
	inventory_group_code: string
	status: number
};

type InventoryGroupArea = {
	inventory_group_code: string;
	inventory_area: string;
	ocr_area_status: number;
	ocr_code_status: number;
	ocr_code: string | null;
};

type InventoryGroupWithAreasAndConfig = InventoryGroup & {
    areas: {
        inventory_area: string;
        ocr_area_status: number;
        ocr_code_status: number;
		ocr_code: string | null;
    }[];
};

type AreaData = {
	checked: boolean;
	ocrCode: string | null;
	ocr_area_status: number;
    ocr_code_status: number;
};

type AreaDataState = {
  	[key: string]: {
		checked: boolean;
		ocrCode: string;
		ocr_area_status: number;
        ocr_code_status: number;
		error?: boolean;
		duplicate?: boolean;
	};
};

