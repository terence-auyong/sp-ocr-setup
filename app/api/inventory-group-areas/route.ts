import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/app/lib/db";

export const GET = async (req: NextRequest) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT DISTINCT
                grp.code AS inventory_group_code,   
                typ.code AS inventory_area          
            FROM app_inv_area_store_group grp
            JOIN app_inv_area_store_type_config_mapping grp_map
                ON grp_map.inv_area_store_group_id = grp.id
                AND grp_map.status = 1              
            JOIN app_type typ
                ON grp_map.type_id = typ.id
                AND typ.status = 1                  
            WHERE grp.status = 1; 
            `
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
