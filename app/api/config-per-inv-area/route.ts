import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const GET = async (req: NextRequest) => {
    const pool = await getPool(req);
    try {
        const [rows] = await pool.query(
            `
            SELECT DISTINCT
                grp.code AS inventory_group_code,   -- inventory group
                typ.code AS inventory_area -- inventory area
            --     typ_config.code AS config_code,      -- configuration name (ex: OCR_AREA)
            --     typ_config.status                   -- 1 = enabled, 0 = disabled
            , group_concat(DISTINCT typ_config.code) AS config_codes
            FROM app_inv_area_store_group grp
            JOIN app_inv_area_store_type_config_mapping grp_map
                ON grp_map.inv_area_store_group_id = grp.id
                AND grp_map.status = 1              -- active mappings only
            JOIN app_type typ
                ON grp_map.type_id = typ.id
                AND typ.status = 1                  -- active inventory areas only
            JOIN app_type_config typ_config
                ON typ_config.id = grp_map.type_config_id
            WHERE grp.status = 1 AND typ_config.code IN ('ocr_area', 'ocr_code')

            GROUP BY grp.id, typ.id;  
            `
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
