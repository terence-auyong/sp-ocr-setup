export const generateInvScript = (
    {checked, ocrCode, config_codes}: AreaData, 
    inventoryGroupCode: string,
) => {
    const script = 
`-- STEP 1: GET INVENTORY GROUP ID
SET @inventory_group_id = (
SELECT id
FROM app_inv_area_store_group
WHERE code = '${ inventoryGroupCode }'
);

-- STEP 2: GET INVENTORY AREA ID
SET @inventory_area_id = (
SELECT typ.id
FROM app_inv_area_store_group grp
JOIN app_inv_area_store_type_config_mapping grp_map
    ON grp_map.inv_area_store_group_id = grp.id
JOIN app_type typ
    ON grp_map.type_id = typ.id
    AND typ.code = '${ ocrCode }'
WHERE grp.id = @inventory_group_id
LIMIT 1
);

-- STEP 3: INCREMENT VERSION
SET @version = (
SELECT GREATEST(
    (
        SELECT COALESCE(MAX(dv.version), 0)
        FROM app_data_version dv
        JOIN app_table tbl
            ON tbl.id = dv.table_id
            AND tbl.name = 'app_inv_area_store_type_config_mapping'
    ),
    (
        SELECT COALESCE(MAX(version), 0)
        FROM app_inv_area_store_type_config_mapping
    )
) + 1
);

-- STEP 4: UPSERT OCR AREA (ENABLE)
UPDATE app_inv_area_store_type_config_mapping
SET
status = 1,
version = @version
WHERE
type_id = @inventory_area_id
AND inv_area_store_group_id = @inventory_group_id
AND type_config_id = (
    SELECT id FROM app_type_config
    WHERE code = '${ ocrCode }' AND value = 1
);

INSERT INTO app_inv_area_store_type_config_mapping (
type_id,
inv_area_store_group_id,
type_config_id,
value,
status,
version,
created_date,
modified_by
)
VALUES (
@inventory_area_id,
@inventory_group_id,
(SELECT id FROM app_type_config WHERE code = 'OCR_AREA' AND value = 1),
'${ ocrCode }',
1,
@version,
NOW(),
'root'
);

${ config_codes.includes("OCR_CODE") ? (
`-- STEP 5: UPSERT OCR CODE
if config codes does have ocr_code in config_codes then use this update
UPDATE app_inv_area_store_type_config_mapping
SET
    value = '${ ocrCode }',
    status = 1,
    version = @version
WHERE
    type_id = @inventory_area_id
    AND inv_area_store_group_id = @inventory_group_id
    AND type_config_id = (
        SELECT id FROM app_type_config
        WHERE code = 'OCR_CODE' AND value = 1
    );`
) : (
`if config codes does not have ocr_code in config_codes then use this update
INSERT INTO app_inv_area_store_type_config_mapping (
    type_id,
    inv_area_store_group_id,
    type_config_id,
    value,
    status,
    version,
    created_date,
    modified_by
)
VALUES (
    @inventory_area_id,
    @inventory_group_id,
    (SELECT id FROM app_type_config WHERE code = 'OCR_CODE' AND value = 1),
    '${ ocrCode }',
    1,
    @version,
    NOW(),
    'root'
);`
)}`

    return script;
}

export const generateUomScript = (uom: Uom | null) => {
    const script = 
`-- STEP 1: INCREMENT VERSION
SET @version = (
SELECT COALESCE(
GREATEST(
(
SELECT MAX(dv.version)
FROM app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_uom'
),
0
),
0
) + 1
);

-- STEP 2: UPDATE VERSION TRACKING
UPDATE app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_uom'
SET dv.version = @version;

-- STEP 3: UPSERT UOM OCR CODE
UPDATE app_uom
SET
ocr_code = '${ uom?.ocr_code }',
version = @version
WHERE short_name = '${ uom?.short_name }';
    `

    return script;
}