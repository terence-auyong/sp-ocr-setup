import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/app/lib/db";

export const GET = async (req: NextRequest) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM app_uom;`
        );

        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }
}
