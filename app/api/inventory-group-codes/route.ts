import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const GET = async (req: NextRequest) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, code AS inventory_group_code, status 
                FROM app_inv_area_store_group;`
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
