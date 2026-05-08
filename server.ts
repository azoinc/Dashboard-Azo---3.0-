import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  database: "postgres",
  user: "postgres.gmvmdryoisurvhtdrppb",
  password: "Azo@2025#Inc",
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
@@ -25,6 +29,11 @@ async function startServer() {
  // Generic query endpoint to replace Supabase client
  app.post("/api/query", async (req, res) => {
    try {
      const { table, select, filters, inFilters, limit, order } = req.body;

      let query = `SELECT ${select || '*'} FROM ${table} WHERE 1=1`;
@@ -38,6 +47,10 @@ async function startServer() {
            query += ` AND "${column}" = $${paramIndex}`;
            values.push(value);
            paramIndex++;
          } else if (operator === 'gte') {
            query += ` AND "${column}" >= $${paramIndex}`;
            values.push(value);
@@ -46,6 +59,20 @@ async function startServer() {
            query += ` AND "${column}" <= $${paramIndex}`;
            values.push(value);
            paramIndex++;
          }
        }
      }
}

startServer();
