import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.SP_HOST,
  database: "postgres",
  user: process.env.SP_USER,
  password: process.env.SP_PS, 
  port: Number(process.env.SP_PORT) || 6543,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req: any, res: any) {
  // Permite apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { table, select, filters, inFilters, limit, order } = req.body;
    
    let query = `SELECT ${select || '*'} FROM ${table} WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters) {
      for (const filter of filters) {
        const { column, operator, value } = filter;
        if (operator === 'eq') {
          query += ` AND "${column}" = $${paramIndex}`;
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
      query += ` LIMIT 10000`;
    }

    const result = await pool.query(query, values);
    res.status(200).json({ data: result.rows, error: null });
  } catch (error: any) {
    console.error("Database query error:", error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
}
