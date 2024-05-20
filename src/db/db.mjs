import pkg from 'pg';
const { Pool, Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export async function tableQuery (query, valuesArray) {
  try {
    const pool = new Pool();
    const client = await pool.connect()
    if (valuesArray == undefined) {
      const results = await client.query(query);
      client.release()
      await pool.end()
      return results;
    } else {
      const results = await client.query(query, valuesArray);
      client.release()
      await pool.end()
      return results;
    }
  }
  catch(e) {
    console.log('DB ERROR:', e)
    return e.stack;
  }
}
