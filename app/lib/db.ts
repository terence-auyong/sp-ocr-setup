import mysql from "mysql2/promise";

const globalForDb = global as unknown as {
    pool?: mysql.Pool;
}

export const pool = globalForDb.pool ?? mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});