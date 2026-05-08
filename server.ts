import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Prioritize environment variables, fallback to provided credentials if needed
const pool = new Pool({
  host: process.env.SP_HOST,
  database: "postgres",
  user: process.env.SP_USER,
  password: process.env.SP_PS,
  port: Number(process.env.SP_PORT),
  ssl: {
    rejectUnauthorized: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({ status: "ok", db_time: result.rows[0].now });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // Generic query endpoint to replace Supabase client
  app.post("/api/query", async (req, res) => {
    let query = '';
    const values: any[] = [];
    try {
      // Allow only POST requests (parity with api/query.ts fallback)
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }

      // Log headers for debugging
      // console.log("[Query API] Headers:", req.headers);
      
      const { table, select, filters, inFilters, limit, order } = req.body;
      
      if (!table) {
        return res.status(400).json({ error: "Missing table name" });
      }

      console.log(`[Query API] Table: ${table}, Select: ${select}`);
      console.log(`[Query API] Filters: ${JSON.stringify(filters)}`);
      console.log(`[Query API] InFilters: ${JSON.stringify(inFilters)}`);

      // Using double quotes for table names in case of special characters or reserved words
      query = `SELECT ${select || '*'} FROM "${table}" WHERE 1=1`;
      let paramIndex = 1;

      if (filters) {
        for (const filter of filters) {
          const { column, operator, value } = filter;
          if (operator === 'eq') {
            query += ` AND "${column}" = $${paramIndex}`;
            values.push(value);
            paramIndex++;
          } else if (operator === 'ilike') {
            query += ` AND "${column}" ILIKE $${paramIndex}`;
            values.push(value);
            paramIndex++;
          } else if (operator === 'gte') {
            query += ` AND "${column}" >= $${paramIndex}`;
            values.push(value);
            paramIndex++;
          } else if (operator === 'lte') {
            query += ` AND "${column}" <= $${paramIndex}`;
            values.push(value);
            paramIndex++;
          } else if (operator === 'or') {
            // Updated OR: support both ilike and eq
            const parts = value.split(',');
            const orClauses = parts.map((p: string) => {
              const subParts = p.split('.');
              if (subParts.length < 3) return '1=0';
              
              const col = subParts[0];
              const op = subParts[1];
              // Join the rest back in case the value contains dots
              const val = subParts.slice(2).join('.');
              
              const placeholder = `$${paramIndex++}`;
              if (op === 'ilike') {
                values.push(val.replace(/\//g, ''));
                return `"${col}" ILIKE ${placeholder}`;
              } else if (op === 'eq') {
                values.push(val);
                return `"${col}" = ${placeholder}`;
              }
              return '1=0';
            });
            query += ` AND (${orClauses.join(' OR ')})`;
          }
        }
      }

      if (inFilters) {
        for (const filter of inFilters) {
          const { column, values: inValues } = filter;
          if (inValues && inValues.length > 0) {
            const placeholders = inValues.map(() => `$${paramIndex++}`).join(', ');
            query += ` AND "${column}" IN (${placeholders})`;
            values.push(...inValues);
          } else {
            query += ` AND 1=0`;
          }
        }
      }

      if (order) {
        const { column, ascending } = order;
        query += ` ORDER BY "${column}" ${ascending ? 'ASC' : 'DESC'}`;
      }

      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(limit);
        paramIndex++;
      } else {
        query += ` LIMIT 50000`; // Default limit for safety
      }

      const startTime = Date.now();
      const result = await pool.query(query, values);
      const duration = Date.now() - startTime;
      console.log(`[Query API] Table: ${table}, Rows: ${result.rows.length}, Duration: ${duration}ms`);
      res.json({ data: result.rows, error: null });
    } catch (error: any) {
      console.error("Database query error:", error);
      console.error("Query attempted:", query);
      console.error("Values:", values);
      res.status(500).json({ data: null, error: { message: error.message } });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
