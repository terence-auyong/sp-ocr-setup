import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const GET = async (req: NextRequest) => {
    try {
        const [rows] = await pool.query(
            // `
            // SELECT DISTINCT
            //     grp.code AS inventory_group_code,   
            //     typ.code AS inventory_area          
            // FROM app_inv_area_store_group grp
            // JOIN app_inv_area_store_type_config_mapping grp_map
            //     ON grp_map.inv_area_store_group_id = grp.id
            //     AND grp_map.status = 1              
            // JOIN app_type typ
            //     ON grp_map.type_id = typ.id
            //     AND typ.status = 1                  
            // WHERE grp.status = 1; 
            // `
            // `
            // SELECT DISTINCT
            //     grp.code AS inventory_group_code,
            //     typ.code AS inventory_area,
            //     MAX(CASE WHEN typ_config.code = 'OCR_AREA' THEN typ_config.status END) AS ocr_area_status,
            //     MAX(CASE WHEN typ_config.code = 'OCR_CODE' THEN typ_config.status END) AS ocr_code_status
            // FROM app_inv_area_store_group grp
            // JOIN app_inv_area_store_type_config_mapping grp_map
            //     ON grp_map.inv_area_store_group_id = grp.id
            //     AND grp_map.status = 1
            // JOIN app_type typ
            //     ON grp_map.type_id = typ.id
            //     AND typ.status = 1
            // JOIN app_type_config typ_config
            //     ON typ_config.id = grp_map.type_config_id
            // WHERE grp.status = 1 
            //     AND typ_config.code IN ('OCR_AREA', 'OCR_CODE')
            // GROUP BY grp.code, typ.code;
            // `
            `
            SELECT DISTINCT
                grp.code AS inventory_group_code,
                typ.code AS inventory_area,

                MAX(CASE WHEN typ_config.code = 'OCR_AREA' 
                        THEN typ_config.status END) AS ocr_area_status,

                MAX(CASE WHEN typ_config.code = 'OCR_CODE' 
                        THEN typ_config.status END) AS ocr_code_status,

                MAX(CASE WHEN typ_config.code = 'OCR_CODE' 
                        THEN grp_map.value END) AS ocr_code

            FROM app_inv_area_store_group grp

            JOIN app_inv_area_store_type_config_mapping grp_map
                ON grp_map.inv_area_store_group_id = grp.id
                AND grp_map.status = 1

            JOIN app_type typ
                ON grp_map.type_id = typ.id
                AND typ.status = 1

            JOIN app_type_config typ_config
                ON typ_config.id = grp_map.type_config_id

            WHERE grp.status = 1 
                AND typ_config.code IN ('OCR_AREA', 'OCR_CODE')

            GROUP BY grp.code, typ.code;
            `
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
