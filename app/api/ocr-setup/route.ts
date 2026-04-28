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

        if (!batches?.length) {
            return NextResponse.json({ error: "At least one batch is required" }, { status: 400 });
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

        // ── 3. Bulk insert extended module mappings ───────────────────────────

        if (extendedModuleCodes.length > 0) {
            const modulePlaceholders = extendedModuleCodes.map(() => `(?, ?, 1, ?, NOW(), 'root')`).join(",");
            const moduleValues = extendedModuleCodes.flatMap((m: { code: string }) => [
                templateId,
                m.code,
                newVersion,
            ]);

            await conn.execute<ResultSetHeader>(
                `INSERT INTO app_ocr_template_module_mapping
                    (template_id, module_code, status, version, created_date, modified_by)
                 VALUES ${modulePlaceholders}`,
                moduleValues
            );
        }

        // ── 4. Collect all (cId, sId) pairs across all batches ────────────────

        type Pair = { cId: number; sId: number; maxScan: number };
        const allPairs: Pair[] = [];

        for (const batch of batches) {
            const maxScan = Number(batch.maxScan) || 0;

            for (const group of batch.groups) {
                const channelId = group.siteGroup.id;

                if (group.stores.length > 0) {
                    for (const s of group.stores) {
                        allPairs.push({ cId: channelId, sId: s.id, maxScan });
                    }
                } else {
                    allPairs.push({ cId: channelId, sId: 0, maxScan });
                }
            }
        }

        // ── 5. Bulk upsert app_ocr_mapping ────────────────────────────────────
        // INSERT ... ON DUPLICATE KEY UPDATE handles upsert in one query
        // Requires a UNIQUE KEY on (store_id, channel_id)

        if (allPairs.length > 0) {
            const mappingPlaceholders = allPairs.map(() => `(?, ?, NOW(), NOW(), 'root', ?, 1)`).join(",");
            const mappingValues = allPairs.flatMap(({ cId, sId }) => [cId, sId, newVersion]);

            await conn.execute(
                `INSERT INTO app_ocr_mapping
                    (channel_id, store_id, created_date, modified_date, modified_by, version, status)
                 VALUES ${mappingPlaceholders}
                 ON DUPLICATE KEY UPDATE
                    version = VALUES(version),
                    status = 1,
                    modified_date = NOW(),
                    modified_by = 'root'`,
                mappingValues
            );

            // ── 6. Bulk insert app_ocr_store_limit ────────────────────────────

            const limitPlaceholders = allPairs.map(() => `(?, ?, ?, ?, NOW(), 1, NOW(), 'root', ?)`).join(",");
            const limitValues = allPairs.flatMap(({ cId, sId, maxScan }) => [
                cId,
                sId,
                templateId,
                maxScan,
                newVersion,
            ]);

            await conn.execute(
                `INSERT INTO app_ocr_store_limit
                    (channel_id, store_id, template_id, \`limit\`, start_date, status, created_date, modified_by, version)
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
        console.error(err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};