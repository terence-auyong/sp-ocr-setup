import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type AreaUpdate = {
  areaName: string;
  ocrCode: string;
  ocr_area_status: number;
  ocr_code_status: number;
};

type RequestBody = {
  inventoryGroupCode: string;
  areas: AreaUpdate[];
};

export async function POST(req: NextRequest) {
  const pool = await getPool(req);
  const conn = await pool.getConnection();
  
  try {
    const payload: RequestBody = await req.json();
    const { inventoryGroupCode, areas } = payload;

    if (!inventoryGroupCode || !areas || areas.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const [[inventoryGroup]] = await conn.execute<any[]>(
      `SELECT id FROM app_inv_area_store_group WHERE code = ?`,
      [inventoryGroupCode]
    );

    if (!inventoryGroup) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Inventory group not found" },
        { status: 404 }
      );
    }

    const inventoryGroupId = inventoryGroup.id;

    for (const area of areas) {
      const [[inventoryArea]] = await conn.execute<any[]>(
        `SELECT typ.id
         FROM app_inv_area_store_group grp
         JOIN app_inv_area_store_type_config_mapping grp_map
           ON grp_map.inv_area_store_group_id = grp.id
         JOIN app_type typ
           ON grp_map.type_id = typ.id
           AND typ.code = ?
         WHERE grp.id = ?
         LIMIT 1`,
        [area.areaName, inventoryGroupId]
      );

      if (!inventoryArea) {
        console.warn(`Area ${area.areaName} not found, skipping...`);
        continue;
      }

      const inventoryAreaId = inventoryArea.id;

      const [[versionResult]] = await conn.execute<any[]>(
        `SELECT GREATEST(
           (
             SELECT COALESCE(MAX(dv.version), 0)
             FROM app_data_version dv
             JOIN app_table tbl
               ON tbl.id = dv.table_id
               AND tbl.name = 'app_inv_area_store_type_config_mapping'
           ),
           (
             SELECT COALESCE(MAX(version), 0)
             FROM app_inv_area_store_type_config_mapping
           )
         ) + 1 AS newVersion`
      );

      const newVersion = versionResult.newVersion;

      await conn.execute(
        `UPDATE app_data_version dv
         JOIN app_table tbl
           ON tbl.id = dv.table_id
           AND tbl.name = 'app_inv_area_store_type_config_mapping'
         SET dv.version = ?`,
        [newVersion]
      );

      const [[ocrAreaConfig]] = await conn.execute<any[]>(
        `SELECT id FROM app_type_config WHERE code = 'OCR_AREA' AND status = 1`
      );

      if (!ocrAreaConfig) {
        throw new Error("OCR_AREA config not found");
      }

      await conn.execute(
        `INSERT INTO app_inv_area_store_type_config_mapping (
           type_id,
           inv_area_store_group_id,
           type_config_id,
           value,
           status,
           version,
           created_date,
           modified_by
         )
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'root')
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           version = VALUES(version),
           modified_by = 'root'`,
        [inventoryAreaId, inventoryGroupId, ocrAreaConfig.id, area.ocrCode, area.ocr_area_status, newVersion]
      );

      const [[ocrCodeConfig]] = await conn.execute<any[]>(
        `SELECT id FROM app_type_config WHERE code = 'OCR_CODE' AND status = 1`
      );

      if (!ocrCodeConfig) {
        throw new Error("OCR_CODE config not found");
      }

      // Record already exists 
      if (area.ocr_code_status === 1) {
        
        // User just unchecked — only update status and version
        if (area.ocr_area_status === 0) {
          await conn.execute(
              `UPDATE app_inv_area_store_type_config_mapping
              SET
                status = 0,
                version = ?,
                modified_by = 'root'
              WHERE
                type_id = ?
                AND inv_area_store_group_id = ?
                AND type_config_id = ?`,
              [newVersion, inventoryAreaId, inventoryGroupId, ocrCodeConfig.id]
          );
        } else {
            // Record exists and is active — update value, status, and version
            await conn.execute(
                `UPDATE app_inv_area_store_type_config_mapping
                SET
                  value = ?,
                  status = ?,
                  version = ?,
                  modified_by = 'root'
                WHERE
                  type_id = ?
                  AND inv_area_store_group_id = ?
                  AND type_config_id = ?`,
                [area.ocrCode, area.ocr_area_status, newVersion, inventoryAreaId, inventoryGroupId, ocrCodeConfig.id]
            );
        }
      } else {
          // Record may not exist, or exists but disabled — upsert to be safe
          await conn.execute(
              `INSERT INTO app_inv_area_store_type_config_mapping (
                  type_id,
                  inv_area_store_group_id,
                  type_config_id,
                  value,
                  status,
                  version,
                  created_date,
                  modified_by
              )
              VALUES (?, ?, ?, ?, ?, ?, NOW(), 'root')
              ON DUPLICATE KEY UPDATE
                  value = VALUES(value),
                  status = VALUES(status),
                  version = VALUES(version),
                  modified_by = 'root'`,
              [inventoryAreaId, inventoryGroupId, ocrCodeConfig.id, area.ocrCode, area.ocr_area_status, newVersion]
          );
      }
    }

    await conn.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${areas.length} area(s)` 
    });

  } catch (err) {
      console.error("Error in inventory OCR setup:", err);
      
      if (conn) {
        await conn.rollback();
      }
      
      return NextResponse.json(
        { error: "Failed to update inventory OCR configuration" },
        { status: 500 }
      );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}