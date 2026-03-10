import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const GET = async (req: NextRequest) => {
    const pool = await getPool(req);
    try {
        const [rows] = await pool.query(
            `
            SELECT DISTINCT uom.*
            FROM app_type type
            JOIN app_inv_area_store_uom_mapping uommap
                ON uommap.type_id = type.id
            JOIN app_uom uom
                ON uommap.uom_id = uom.id
                AND uom.ocr_code IS NOT NULL
            JOIN app_type_config_mapping type_config_map
                ON type_config_map.type_id = type.id
            WHERE 
                type.status = 1 
            GROUP BY type.description, type.ocr_code, uom.short_name
            ORDER BY type.sequence, CAST(type_config_map.value AS signed)
            `
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
