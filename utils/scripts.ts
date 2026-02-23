export const generateInvScript = (
    areaData: AreaDataState, 
    inventoryGroupCode: string,
) => {
    const checkedAreas = Object.entries(areaData).filter(([_, value]) => value.checked);
    
    if (checkedAreas.length === 0) {
        return "-- No areas selected";
    }

    const scripts = checkedAreas.map(([areaName, data]) => {
        return `
-- ========================================
-- SCRIPT FOR AREA: ${areaName}
-- ========================================

-- STEP 1: GET INVENTORY GROUP ID
SET @inventory_group_id = (
    SELECT id
    FROM app_inv_area_store_group
    WHERE code = '${inventoryGroupCode}'
);

-- STEP 2: GET INVENTORY AREA ID
SET @inventory_area_id = (
    SELECT typ.id
    FROM app_inv_area_store_group grp
    JOIN app_inv_area_store_type_config_mapping grp_map
        ON grp_map.inv_area_store_group_id = grp.id
    JOIN app_type typ
        ON grp_map.type_id = typ.id
        AND typ.code = '${areaName}'
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
    '${data.ocrCode}',
    1,
    @version,
    NOW(),
    'root'
)
ON DUPLICATE KEY UPDATE
    status = 1,
    version = @version;

${data.ocr_code_status && data.ocr_code_status === 1 ? `
-- STEP 5: UPDATE EXISTING OCR CODE
UPDATE app_inv_area_store_type_config_mapping
SET
    value = '${data.ocrCode}',
    status = 1,
    version = @version
WHERE
    type_id = @inventory_area_id
    AND inv_area_store_group_id = @inventory_group_id
    AND type_config_id = (
        SELECT id FROM app_type_config
        WHERE code = 'OCR_CODE' AND value = 1
    );
` : `
-- STEP 5: INSERT NEW OCR CODE
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
    '${data.ocrCode}',
    1,
    @version,
    NOW(),
    'root'
);
`}
`;
    });

    return scripts.join('\n\n');
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