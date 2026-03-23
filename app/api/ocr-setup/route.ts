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
            batches, // BatchEntry[] — each entry has groups[] with its own stores, and a shared maxScan
        } = payload;

        // batches shape (BatchEntry[]):
        // [
        //   {
        //     id,
        //     maxScan,
        //     groups: [
        //       { siteGroup: { id, code, name }, stores: [{ id, store_code, name, channel_id }] },
        //       ...
        //     ]
        //   },
        //   ...
        // ]

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

        // ── 3. Insert extended module mappings ────────────────────────────────

        if (extendedModuleCodes.length > 0) {
            const values = extendedModuleCodes
                .map((m: { code: string }) => `(${templateId}, '${m.code}', 1, ${newVersion}, NOW(), NOW())`)
                .join(",");

            await conn.execute<ResultSetHeader>(
                `INSERT INTO app_ocr_template_module_mapping
                (template_id, module_code, status, version, created_date, modified_by)
                VALUES ${values}`
            );
        }

        // ── 4. Loop each BatchEntry → each group → each store pair ────────────
        //
        // Site Group mode:
        //   group.siteGroup.id = real channel id, group.stores = [] → sId defaults to 0
        //   → inserts: (channel_id=X, store_id=0)
        //
        // Store mode:
        //   group.siteGroup.id = 0 (filter UI only), group.stores = real stores
        //   → inserts: (channel_id=0, store_id=X) per store

        for (const batch of batches) {
            const maxScan = Number(batch.maxScan) || 0;

            for (const group of batch.groups) {
                const channelId = group.siteGroup.id; // 0 in store mode

                const pairs: { cId: number; sId: number }[] =
                    group.stores.length > 0
                        ? group.stores.map((s: { id: number }) => ({ cId: channelId, sId: s.id }))
                        : [{ cId: channelId, sId: 0 }]; // site group mode: store_id = 0

                for (const { cId, sId } of pairs) {
                    // Upsert app_ocr_mapping
                    const [existing] = await conn.execute(
                        `SELECT id FROM app_ocr_mapping WHERE store_id = ? AND channel_id = ?`,
                        [sId, cId]
                    );

                    if ((existing as any[]).length > 0) {
                        await conn.execute(
                            `UPDATE app_ocr_mapping
                            SET version = ?, status = 1, modified_date = NOW(), modified_by = 'root'
                            WHERE store_id = ? AND channel_id = ?`,
                            [newVersion, sId, cId]
                        );
                    } else {
                        await conn.execute(
                            `INSERT INTO app_ocr_mapping
                            (channel_id, store_id, created_date, modified_date, modified_by, version, status)
                            VALUES (?, ?, NOW(), NOW(), 'root', ?, 1)`,
                            [cId, sId, newVersion]
                        );
                    }

                    // Insert app_ocr_store_limit
                    await conn.execute(
                        `INSERT INTO app_ocr_store_limit
                        (channel_id, store_id, template_id, \`limit\`, start_date, status, created_date, modified_by, version)
                        VALUES (?, ?, ?, ?, NOW(), 1, NOW(), 'root', ?)`,
                        [cId, sId, templateId, maxScan, newVersion]
                    );
                }
            }
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