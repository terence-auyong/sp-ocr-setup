import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const GET = async (req: NextRequest) => {
    try {
        const [rows] = await pool.query(
            `
            SELECT id, code, name FROM app_module 
            WHERE code IN (
                'device_inventory_areas',
                'device_osa',
                'device_near_expiry',
                'device_sos'
            );
            `
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
