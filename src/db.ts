import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('Database connected', process.env.DATABASE_URL);

// Simple, clean wrapper
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default {
  query,
  pool,
};
