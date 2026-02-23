import { NextRequest, NextResponse } from "next/server";
import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

type RequestBody = {
  shortName: string;
  ocrCode: string;
};

export const POST = async (req: NextRequest) => {
    const conn = await pool.getConnection();
    
    try {
        const payload: RequestBody = await req.json();
        const { shortName, ocrCode } = payload;

        if (!shortName || !ocrCode) {
        return NextResponse.json(
            { error: "Missing required fields: shortName and ocrCode" },
            { status: 400 }
        );
        }

        await conn.beginTransaction();

        const [[uom]] = await conn.execute<RowDataPacket[]>(
            `SELECT id FROM app_uom WHERE short_name = ?`,
            [shortName]
        );

        if (!uom) {
            await conn.rollback();
            return NextResponse.json(
                { error: `UOM with short_name '${shortName}' not found` },
                { status: 404 }
            );
        }

        const [[versionResult]] = await conn.execute<RowDataPacket[]>(
            `SELECT COALESCE(
                GREATEST(
                (
                    SELECT MAX(dv.version)
                    FROM app_data_version dv
                    JOIN app_table tbl
                    ON tbl.id = dv.table_id
                    AND tbl.name = 'app_uom'
                ),
                0
                ),
                0
            ) + 1 AS newVersion`
        );

        const newVersion = versionResult.newVersion;

        // Update version tracking
        await conn.execute(
            `UPDATE app_data_version dv
            JOIN app_table tbl
                ON tbl.id = dv.table_id
                AND tbl.name = 'app_uom'
            SET dv.version = ?`,
            [newVersion]
        );

        // Update UOM OCR code
        const [updateResult] = await conn.execute<ResultSetHeader>(
            `UPDATE app_uom
            SET
                ocr_code = ?,
                version = ?,
                modified_by = 'root'
            WHERE short_name = ?`,
            [ocrCode, newVersion, shortName]
        );

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return NextResponse.json(
                    { error: `Failed to update UOM '${shortName}'` },
                    { status: 500 }
            );
        }

        await conn.commit();

        return NextResponse.json({ 
            success: true, 
            message: `Successfully updated UOM '${shortName}' with OCR code '${ocrCode}'`,
            data: {
                shortName,
                ocrCode,
                version: newVersion
            }
        });

    } catch (err) {
        console.error("Error in UOM OCR setup:", err);
        
        if (conn) {
            await conn.rollback();
        }
        
        return NextResponse.json(
            { error: "Failed to update UOM OCR configuration" },
            { status: 500 }
        );
    } finally {
        if (conn) {
            conn.release();
        }
    }
}