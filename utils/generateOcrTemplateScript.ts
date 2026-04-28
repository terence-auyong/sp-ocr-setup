import { OcrTemplateData } from "@/types/ocrTemplate";

const generateOcrTemplateScript = (formData: OcrTemplateData) => {

    const moduleCodesSql = formData.moduleExtended
        .map(code => `'${code}'`)
        .join(', ');

    // Each BatchEntry has groups[] — one group per site group, each with its own stores
    const batchBlocks = formData.batches.flatMap(batch => {
        const maxScan = batch.maxScan;

        return batch.groups.flatMap(group => {
            const channelId = group.siteGroup.id;
            const channelName = group.siteGroup.name;

            const pairs = group.stores.length > 0
                ? group.stores.map(s => ({ cId: channelId, sId: s.id, storeName: s.name, channelName }))
                : [{ cId: channelId, sId: 0, storeName: 'N/A', channelName }];

            return pairs.map(({ cId, sId, storeName, channelName }) => `
-----------------------------------------------
-- Site Group: ${channelName} | Store: ${storeName} | Max Scan: ${maxScan}

-- STEP 1: INCREMENT VERSION
SET @version = (
        SELECT COALESCE(
        GREATEST(
            (
                SELECT MAX(dv.version)
                FROM app_data_version dv
                JOIN app_table tbl
                ON tbl.id = dv.table_id
                AND tbl.name = 'app_ocr_mapping'
            ),
            0
        ),
        0
) + 1)
;

-- STEP 2: UPDATE VERSION TRACKING
UPDATE app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_ocr_mapping'
SET dv.version = @version;


SET @store_id = '${sId}'; -- store field
SET @channel_id = '${cId}' -- channel field

INSERT INTO app_ocr_mapping (channel_id, store_id, created_date, modified_date, modified_by, version)
VALUES (
    '@store_id',
    '@channel_id',
    NOW(),
    NOW(),
    'root',
    @version
);

UPDATE app_ocr_mapping
SET version=@version, status=1
WHERE store_id=@store_id AND channel_id=@channel_id;

-----------------------------------------------

-- STEP 1: INCREMENT VERSION
SET @version = (
        SELECT COALESCE(
        GREATEST(
                (
                        SELECT MAX(dv.version)
                        FROM app_data_version dv
                        JOIN app_table tbl
                        ON tbl.id = dv.table_id
                        AND tbl.name = 'app_ocr_store_limit'
                ),
                0
        ),
        0
) + 1)
;

-- STEP 2: UPDATE VERSION TRACKING
UPDATE app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_ocr_store_limit'
SET dv.version = @version;

INSERT INTO app_ocr_store_limit (channel_id, store_id, template_id, \`limit\`, start_date, status, created_date, modified_by, version)
VALUES (
    @channel_id,
    @store_id,
    @template_id,
    ${maxScan}, -- limit field
    NOW(),
    1,
    NOW(),
    'root',
    @version
);`);
        });
    }).join('\n');

  return (
    `-- STEP 1: INCREMENT VERSION
SET @version = (
    SELECT COALESCE(
    GREATEST(
        (
            SELECT MAX(dv.version)
            FROM app_data_version dv
            JOIN app_table tbl
            ON tbl.id = dv.table_id
            AND tbl.name = 'app_ocr_template'
        ),
        0
    ),
    0
) + 1)
;

-- STEP 2: UPDATE VERSION TRACKING
UPDATE app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_ocr_template'
SET dv.version = @version;

SET @ocr_template_code = '${ formData.ocrCode }'; -- CODE FIELD
SET @ocr_name = '${ formData.name }';  -- NAME FIELD
SET @ocr_description = '${ formData.description }';  -- DESCRIPTION FIELD
SET @ocr_api = '${ formData.ocrApi }'; -- OCR API FIELD
SET @module_code = '${ formData.module }';  -- Module Code FIELD

INSERT INTO app_ocr_template (code, name, description, ocr_api_id, module_code, status, version, created_date, modified_by)
VALUES (
    @ocr_template_code, 
    @ocr_name,
    @ocr_description,
    @ocr_api,
    @module_code,
    1,
    @version,
    NOW(),
    'root'
);

-----------------------------------------------

-- STEP 1: INCREMENT VERSION
SET @version = (
        SELECT COALESCE(
        GREATEST(
            (
                SELECT MAX(dv.version)
                FROM app_data_version dv
                JOIN app_table tbl
                ON tbl.id = dv.table_id
                AND tbl.name = 'app_ocr_template_module_mapping'
            ),
            0
        ),
        0
) + 1)
;

-- STEP 2: UPDATE VERSION TRACKING
UPDATE app_data_version dv
JOIN app_table tbl
ON tbl.id = dv.table_id
AND tbl.name = 'app_ocr_template_module_mapping'
SET dv.version = @version;


SET @template_id = (
SELECT id FROM app_ocr_template
WHERE ocr_tempate_code=@ocr_template_code AND ocr_api_id=@ocr_api AND name=@ocr_name
ORDER BY id DESC LIMIT 1
)

INSERT INTO app_ocr_template_module_mapping (template_id, module_code, status, version, created_date, modified_by)
SELECT @template_id, code, 1,@version, NOW(),  NOW()
FROM app_module 
WHERE code IN (
    ${moduleCodesSql}
); -- module code
${batchBlocks}`)
}

export default generateOcrTemplateScript;