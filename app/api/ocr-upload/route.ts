import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getPool } from "@/lib/db";

const chunkArray = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
    );

const CHUNK_SIZE = 1000; // Increased for cloud performance

export const POST = async (req: NextRequest) => {
    const pool = await getPool(req);
    const conn = await pool.getConnection();

    let rolledBack = false;
    const rollback = async () => {
        if (rolledBack) return;
        rolledBack = true;
        await conn.rollback();
        conn.release();
    };

    req.signal.addEventListener("abort", () => rollback());

    try {
        const payload = await req.json();
        const templates = Array.isArray(payload.templates) ? payload.templates : [payload];

        if (!templates.length) {
            return NextResponse.json({ error: "No templates provided" }, { status: 400 });
        }

        await conn.beginTransaction();

        // ── 1. Update Version ────────────────────────────────────────────────
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

        // ── 2. The "Gathering" Phase (Building Buckets in RAM) ───────────────
        const allMappings: any[] = [];
        const allLimits: any[] = [];
        const results = [];

        for (const t of templates) {
            // We insert Template row-by-row to get the insertId
            const [insertTemplateResult] = await conn.execute<ResultSetHeader>(
                `INSERT INTO app_ocr_template
                    (code, name, description, ocr_api_id, module_code, status, version, created_date, modified_by)
                 VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), 'root')`,
                [t.ocrCode, t.ocrName, t.description, t.ocrApi?.id || null, t.moduleCode.code, newVersion]
            );
            const templateId = insertTemplateResult.insertId;

            // Push extended modules (Small enough to do inside loop usually)
            if (t.extendedModuleCodes?.length > 0) {
                const moduleValues = t.extendedModuleCodes.flatMap((m: any) => [templateId, m.code, newVersion]);
                const placeholders = t.extendedModuleCodes.map(() => `(?, ?, 1, ?, NOW(), 'root')`).join(",");
                await conn.execute(
                    `INSERT INTO app_ocr_template_module_mapping (template_id, module_code, status, version, created_date, modified_by)
                     VALUES ${placeholders}`,
                    moduleValues
                );
            }

            // Fill our big "Buckets" with raw data for the mapping/limit tables
            for (const batch of t.batches) {
                const maxScan = Number(batch.maxScan) || 0;
                for (const group of batch.groups) {
                    const status = group.isDelete === 0 ? 0 : 1;
                    
                    // Add to Mappings Bucket
                    allMappings.push([
                        group.siteGroup?.id ?? 0, group.store?.id ?? 0, group.region?.id ?? 0, 
                        group.storeChannel?.id ?? 0, group.storeGroup?.id ?? 0, group.storeType?.id ?? 0, 
                        newVersion, status
                    ]);

                    // Add to Limits Bucket
                    allLimits.push([
                        group.siteGroup?.id ?? 0, group.store?.id ?? 0, group.region?.id ?? 0, 
                        group.storeChannel?.id ?? 0, group.storeGroup?.id ?? 0, group.storeType?.id ?? 0,
                        templateId, maxScan, group.startDate || null, group.endDate || null, status, newVersion
                    ]);
                }
            }
            results.push({ templateId, ocrCode: t.ocrCode });
        }

        // ── 3. The "Blasting" Phase (Parallel Cloud Push) ────────────────────
        
        // Prepare Mapping Parallel Tasks
        const mappingTasks = chunkArray(allMappings, CHUNK_SIZE).map(chunk => {
            const placeholders = chunk.map(() => `(?, ?, ?, ?, ?, ?, NOW(), NOW(), 'root', ?, ?)`).join(",");
            return conn.execute(
                `INSERT INTO app_ocr_mapping
                    (channel_id, store_id, region_id, store_channel_id, store_group_id, store_type_id, created_date, modified_date, modified_by, version, status)
                 VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE 
                    region_id=VALUES(region_id), store_channel_id=VALUES(store_channel_id), store_group_id=VALUES(store_group_id), 
                    store_type_id=VALUES(store_type_id), version=VALUES(version), status=VALUES(status), modified_date=NOW()`,
                chunk.flat()
            );
        });

        // Prepare Limit Parallel Tasks
        const limitTasks = chunkArray(allLimits, CHUNK_SIZE).map(chunk => {
            const placeholders = chunk.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'root', ?)`).join(",");
            return conn.execute(
                `INSERT INTO app_ocr_store_limit
                    (channel_id, store_id, region_id, store_channel_id, store_group_id, store_type_id, template_id, \`limit\`, start_date, end_date, status, modified_by, version)
                 VALUES ${placeholders}`,
                chunk.flat()
            );
        });

        // Fire everything at the Cloud DB at the same time
        await Promise.all([...mappingTasks, ...limitTasks]);

        await conn.commit();
        conn.release();
        return NextResponse.json({ success: true, results });

    } catch (err) {
        await rollback();
        console.error("Critical Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};