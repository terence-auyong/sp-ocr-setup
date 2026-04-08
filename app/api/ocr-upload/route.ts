import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getPool } from "@/lib/db";

export const POST = async (req: NextRequest) => {
    const pool = await getPool(req);
    const conn = await pool.getConnection();

    try {
        const payload = await req.json();

        const {
            ocrCode,
            ocrName,
            description,
            ocrApi,
            moduleCode,
            extendedModuleCodes,
            batches,
        } = payload;

        console.log(JSON.stringify(payload, null, 2)); 

        if (!ocrCode || !ocrName || !extendedModuleCodes?.length) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await conn.beginTransaction();

        // ── 1. Bump version ───────────────────────────────────────────────────
        const [[{ maxVersion }]] = await conn.execute<any[]>(
            `SELECT COALESCE(MAX(dv.version), 0) AS maxVersion
             FROM app_data_version dv
             JOIN app_table tbl ON tbl.id = dv.table_id
             WHERE tbl.name = 'app_ocr_template'`
        );
        const newVersion = maxVersion + 1;

        await conn.execute(
            `UPDATE app_data_version dv
             JOIN app_table tbl ON tbl.id = dv.table_id
             SET dv.version = ?
             WHERE tbl.name = 'app_ocr_template'`,
            [newVersion]
        );

        // ── 2. Insert OCR template ────────────────────────────────────────────
        const [insertTemplateResult] = await conn.execute<ResultSetHeader>(
            `INSERT INTO app_ocr_template
                (code, name, description, ocr_api_id, module_code, status, version, created_date, modified_by)
             VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), 'root')`,
            [ocrCode, ocrName, description, ocrApi?.id || null, moduleCode.code, newVersion]
        );
        const templateId = insertTemplateResult.insertId;

        // ── 3. Insert extended module mappings ───────────────────────────
        if (extendedModuleCodes.length > 0) {
            const modulePlaceholders = extendedModuleCodes.map(() => `(?, ?, 1, ?, NOW(), 'root')`).join(",");
            
            const moduleValues = extendedModuleCodes.flatMap((m: { code: string }) => [
                templateId, 
                m.code, 
                newVersion
            ]);

            // FIX: You must inject the 'modulePlaceholders' string into the SQL query template
            await conn.execute(
                `INSERT INTO app_ocr_template_module_mapping
                    (template_id, module_code, status, version, created_date, modified_by)
                VALUES ${modulePlaceholders}`, 
                moduleValues
            );
        }

        // ── 4. Collect flat mapping rows ─────────────────────────────────────
        const allRows = [];

        for (const batch of batches) {
            const maxScan = Number(batch.maxScan) || 0;

            for (const group of batch.groups) {
                allRows.push({
                    cId: group.siteGroup?.id ?? 0,
                    sId: group.store?.id ?? 0,
                    maxScan,
                    regId: group.region?.id ?? 0,
                    chanId: group.storeChannel?.id ?? 0,
                    grpId: group.storeGroup?.id ?? 0,
                    typeId: group.storeType?.id ?? 0,
                    startDate: group.startDate || null,
                    endDate: group.endDate || null,
                    status: group.isDelete === 0 ? 0 : 1, 
                    version: newVersion
                });
            }
        }

        if (allRows.length > 0) {
            // ── 5. Insert app_ocr_mapping ────────────────────────────────────
            const mappingPlaceholders = allRows.map(() => `(?, ?, ?, ?, ?, ?, NOW(), NOW(), 'root', ?, ?)`).join(",");
            const mappingValues = allRows.flatMap((row) => [
                row.cId, row.sId, row.regId, row.chanId, row.grpId, row.typeId, 
                row.version, row.status
            ]);

            await conn.execute(
                `INSERT INTO app_ocr_mapping
                    (channel_id, store_id, region_id, store_channel_id, store_group_id, store_type_id, 
                    created_date, modified_date, modified_by, version, status)
                VALUES ${mappingPlaceholders}
                ON DUPLICATE KEY UPDATE
                    region_id = VALUES(region_id),
                    store_channel_id = VALUES(store_channel_id),
                    store_group_id = VALUES(store_group_id),
                    store_type_id = VALUES(store_type_id),
                    version = VALUES(version),
                    status = VALUES(status),
                    modified_date = NOW()`,
                mappingValues
            );

            // ── 6. Insert app_ocr_store_limit ────────────────────────────────
            const limitPlaceholders = allRows.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'root', ?)`).join(",");
            const limitValues = allRows.flatMap((row) => [
                row.cId, row.sId, row.regId, row.chanId, row.grpId, row.typeId,
                templateId, row.maxScan, row.startDate, row.endDate, 
                row.status, row.version
            ]);

            await conn.execute(
                `INSERT INTO app_ocr_store_limit
                    (channel_id, store_id, region_id, store_channel_id, store_group_id, store_type_id, 
                    template_id, \`limit\`, start_date, end_date, status, modified_by, version)
                VALUES ${limitPlaceholders}`,
                limitValues
            );
        }

        await conn.commit();
        conn.release();
        return NextResponse.json({ success: true, templateId });
    } catch (err) {
        await conn.rollback();
        conn.release();
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};