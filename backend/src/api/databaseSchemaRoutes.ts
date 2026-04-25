import { Router, Request, Response } from 'express';
import { getStringParam } from '../utils/paramParser.js';
import { logger } from '../utils/logger.js';
import * as pg from 'pg';
import * as mysql from 'mysql2/promise';

export const databaseSchemaRouter = Router();

/**
 * POST /api/database/test-connection
 * Test database connection credentials
 */
databaseSchemaRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { type, host, port, database, username, password, table } = req.body;

    if (!type || !host || !port || !database || !username || !password || !table) {
      return res.status(400).json({
        success: false,
        message: 'Missing required connection parameters',
      });
    }

    console.log('[v0] Testing database connection to:', { type, host, database, table });

    // Test connection based on database type
    if (type === 'postgresql') {
      const client = new pg.Client({
        host,
        port,
        database,
        user: username,
        password,
      });
      await client.connect();
      await client.end();
    } else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port,
        database,
        user: username,
        password,
      });
      await connection.end();
    } else if (type === 'sql_server') {
      // SQL Server connection would use mssql or tedious package
      throw new Error('SQL Server schema detection not yet implemented');
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }

    console.log('[v0] Database connection successful');
    return res.json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error: any) {
    console.error('[v0] Database connection test failed:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Connection test failed',
    });
  }
});

/**
 * POST /api/database/schema
 * Get list of tables in database
 */
databaseSchemaRouter.post('/schema', async (req: Request, res: Response) => {
  try {
    const { type, host, port, database, username, password } = req.body;

    if (!type || !host || !port || !database || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required connection parameters',
      });
    }

    console.log('[v0] Loading schema for database:', database);
    let tables: string[] = [];

    if (type === 'postgresql') {
      const client = new pg.Client({
        host,
        port,
        database,
        user: username,
        password,
      });
      await client.connect();

      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      tables = result.rows.map((row: any) => row.table_name);

      await client.end();
    } else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port,
        database,
        user: username,
        password,
      });

      const [rows]: any = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [database]);
      tables = rows.map((row: any) => row.TABLE_NAME);

      await connection.end();
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }

    console.log('[v0] Found tables:', tables);
    return res.json({
      success: true,
      tables,
    });
  } catch (error: any) {
    console.error('[v0] Schema load failed:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to load schema',
    });
  }
});

/**
 * POST /api/database/columns
 * Get columns for a specific table with their types
 */
databaseSchemaRouter.post('/columns', async (req: Request, res: Response) => {
  try {
    const { type, host, port, database, username, password, table } = req.body;

    if (!type || !host || !port || !database || !username || !password || !table) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    console.log('[v0] Loading columns for table:', table);
    let columns: Array<{ name: string; type: string }> = [];

    if (type === 'postgresql') {
      const client = new pg.Client({
        host,
        port,
        database,
        user: username,
        password,
      });
      await client.connect();

      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      columns = result.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
      }));

      await client.end();
    } else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port,
        database,
        user: username,
        password,
      });

      const [rows]: any = await connection.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
        ORDER BY ORDINAL_POSITION
      `, [table, database]);
      columns = rows.map((row: any) => ({
        name: row.COLUMN_NAME,
        type: row.COLUMN_TYPE,
      }));

      await connection.end();
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }

    console.log('[v0] Found columns:', columns);
    return res.json({
      success: true,
      columns,
    });
  } catch (error: any) {
    console.error('[v0] Column load failed:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to load columns',
    });
  }
});

export default databaseSchemaRouter;
