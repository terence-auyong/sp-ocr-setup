// import { NextRequest, NextResponse } from "next/server";
// import mysql, { ResultSetHeader } from "mysql2/promise";
// import { getPool } from "@/lib/db";

// export const POST = async (req: NextRequest) => {
// 	const pool = await getPool(req);
// 	const conn = await pool.getConnection();

// 	try {
// 		const payload = await req.json();

// 		const {
// 			ocrCode,
// 			ocrName,
// 			description,
// 			ocrApi,
// 			moduleCode,
// 			extendedModuleCodes,
// 			store,
// 			channel,
// 			limit,
// 		} = payload;

// 		if (!ocrCode || !ocrName || !extendedModuleCodes?.length) {
// 			return NextResponse.json(
// 				{ error: "Missing required fields" },
// 				{ status: 400 }
// 			);
// 		}

// 		await conn.beginTransaction();

// 		const [[{ maxVersion }]] = await conn.execute<any[]>(
// 			`SELECT COALESCE(MAX(dv.version), 0) AS maxVersion
// 			FROM app_data_version dv
// 			JOIN app_table tbl ON tbl.id = dv.table_id
// 			WHERE tbl.name = 'app_ocr_template'`
// 		);

// 		const newVersion = maxVersion + 1;

// 		await conn.execute(
// 			`UPDATE app_data_version dv
// 			JOIN app_table tbl ON tbl.id = dv.table_id
// 			SET dv.version = ?
// 			WHERE tbl.name = 'app_ocr_template'`,
// 			[newVersion]
// 		);

// 		const [insertTemplateResult] = await conn.execute<ResultSetHeader>(
// 			`INSERT INTO app_ocr_template
// 				(code, name, description, ocr_api_id, module_code, status, version, created_date, modified_by)
// 			VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), 'root')`,
// 			[ocrCode, ocrName, description, ocrApi?.id || null, moduleCode.code, newVersion]
// 		);

// 		const templateId = (insertTemplateResult).insertId;

// 		if (extendedModuleCodes.length > 0) {
// 			const values = extendedModuleCodes
// 				.map((m: { code: string }) => `(${templateId}, '${m.code}', 1, ${newVersion}, NOW(), NOW())`)
// 				.join(",");

// 			await conn.execute<ResultSetHeader>(
// 				`INSERT INTO app_ocr_template_module_mapping
// 				(template_id, module_code, status, version, created_date, modified_by)
// 				VALUES ${values}`
// 			);
// 		}

// 		const storeId = store?.id || 0;
// 		const channelId = channel?.id || 0;

// 		const [existing] = await conn.execute(
// 			`SELECT id FROM app_ocr_mapping 
// 			WHERE store_id = ? AND channel_id = ?`,
// 			[storeId, channelId]
// 		);

// 		if ((existing as any[]).length > 0) {
// 			// Update existing record
// 			await conn.execute(
// 				`UPDATE app_ocr_mapping
// 				SET version = ?, status = 1, modified_date = NOW(), modified_by = 'root'
// 				WHERE store_id = ? AND channel_id = ?`,
// 				[newVersion, storeId, channelId]
// 			);

// 		} else {
// 			// Insert new record
// 			await conn.execute(
// 				`INSERT INTO app_ocr_mapping
// 				(channel_id, store_id, created_date, modified_date, modified_by, version, status)
// 				VALUES (?, ?, NOW(), NOW(), 'root', ?, 1)`,
// 				[channelId, storeId, newVersion]
// 			);
// 		}

// 		await conn.execute(
// 			`INSERT INTO app_ocr_store_limit
// 			(channel_id, store_id, template_id, \`limit\`, start_date, status, created_date, modified_by, version)
// 			VALUES (?, ?, ?, ?, NOW(), 1, NOW(), 'root', ?)`,
// 			[channelId, storeId, templateId, limit, newVersion]
// 		);

// 		await conn.commit();
// 		conn.release();

// 		return NextResponse.json({ success: true, templateId });
// 	} catch (err) {
// 		console.error(err);
// 	}
// }

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
            batches, // SiteGroupRow[] — each entry is one site group with its own stores + maxScan
        } = payload;

        // batches shape (SiteGroupRow[]):
        // [
        //   { id, siteGroup: { id, code, name }, stores: [{ id, store_code, name, channel_id }], maxScan },
        //   ...
        // ]

        if (!ocrCode || !ocrName || !extendedModuleCodes?.length) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!batches?.length) {
            return NextResponse.json({ error: "At least one site group is required" }, { status: 400 });
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

        // ── 4. Loop each SiteGroupRow ─────────────────────────────────────────
        // Each row is one site group with its own stores and maxScan.
        // If the row has stores → one insert per store (channel_id + store_id).
        // If no stores (site-group-only mode) → one insert with store_id = 0.

        for (const row of batches) {
            const channelId = row.siteGroup.id;
            const maxScan = Number(row.maxScan) || 0;

            const pairs: { cId: number; sId: number }[] =
                row.stores.length > 0
                    ? row.stores.map((s: { id: number }) => ({ cId: channelId, sId: s.id }))
                    : [{ cId: channelId, sId: 0 }];

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