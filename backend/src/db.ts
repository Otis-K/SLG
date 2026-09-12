import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';
import { ensureSchema } from './schema.js';

export async function createDatabasePool(): Promise<Pool> {
  const admin = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
  });

  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await admin.end();

  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });

  await pool.query('SELECT 1');
  await ensureSchema(pool);
  return pool;
}

export async function getDatabaseStatus(pool: Pool) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT VERSION() AS version, DATABASE() AS databaseName');
  return rows[0] ?? null;
}

export async function ping(pool: Pool): Promise<void> {
  await pool.query('SELECT 1');
}

export async function createRequestLog(pool: Pool, path: string, localDate: string) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS backend_request_log (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      path VARCHAR(255) NOT NULL,
      local_date VARCHAR(16) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await pool.execute(
    'INSERT INTO backend_request_log (path, local_date) VALUES (?, ?)',
    [path, localDate],
  );
}
