const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

console.log("URL:", process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("Success:", res.rows);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
}
main();
