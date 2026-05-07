import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Diagnostic endpoint — tests raw PostgreSQL connectivity.
 * Visit: http://localhost:3000/api/health
 */
export async function GET() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({
      status: "error",
      message: "DATABASE_URL is not set in .env",
    }, { status: 500 });
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as time, current_database() as db");
    client.release();
    await pool.end();

    return NextResponse.json({
      status: "ok",
      database: result.rows[0].db,
      serverTime: result.rows[0].time,
      connectionString: connectionString.replace(/:[^:@]+@/, ":***@"), // hide password
    });
  } catch (error: any) {
    await pool.end().catch(() => {});
    return NextResponse.json({
      status: "error",
      message: error.message,
      code: error.code,
      connectionString: connectionString.replace(/:[^:@]+@/, ":***@"),
    }, { status: 500 });
  }
}
