type InventoryGroup = {
	id: number
	inventory_group_code: string
	status: number
};

type InventoryGroupArea = {
	inventory_group_code: string;
	inventory_area: string;
};

type ConfigPerInvArea = {
	config_codes: string;
	inventory_area: string;
	inventory_group_code: string;
}

type InventoryGroupWithAreasAndConfig = InventoryGroup & {
	areas: {
		inventory_area: string;
		config_codes: string;
	}[];
};

type CheckboxState = {
	[key: string]: boolean;
};

type AreaData = {
	checked: boolean;
	ocrCode: string;
	config_codes: string;
};

type AreaDataState = {
  	[key: string]: {
		checked: boolean;
		ocrCode: string;
		config_codes: string;
		error?: boolean
	};
};

