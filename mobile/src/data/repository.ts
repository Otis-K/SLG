import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import type { AppState } from '../domain/types';
import { DataSourceError, validatePersistedAppState } from './contracts';

const DATABASE_NAME = 'shiliange.db';
const DATABASE_VERSION = 1;
const DATABASE_KEY_NAME = 'shiliange.database.key.v1';

type StateRow = {
  schema_version: number;
  payload: string;
  updated_at: string;
};

async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existing) return existing;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export interface AppRepository {
  initialize(): Promise<void>;
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}

export class SQLiteAppRepository implements AppRepository {
  private databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    await this.getDatabase();
  }

  async load(): Promise<AppState | null> {
    await this.writeQueue.catch(() => undefined);
    const database = await this.getDatabase();
    const row = await database.getFirstAsync<StateRow>(
      'SELECT schema_version, payload, updated_at FROM app_state WHERE id = 1',
    );
    if (!row) return null;

    try {
      return validatePersistedAppState(JSON.parse(row.payload));
    } catch (cause) {
      if (cause instanceof DataSourceError) throw cause;
      throw new DataSourceError('本地数据无法解析', {
        code: 'LOCAL_STATE_CORRUPT',
        cause,
      });
    }
  }

  save(state: AppState): Promise<void> {
    const snapshot = validatePersistedAppState(state);
    return this.enqueueWrite(async () => {
      const database = await this.getDatabase();
      const payload = JSON.stringify(snapshot);
      const updatedAt = new Date().toISOString();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync(
          `INSERT INTO app_state (id, schema_version, payload, updated_at)
           VALUES (1, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             schema_version = excluded.schema_version,
             payload = excluded.payload,
             updated_at = excluded.updated_at`,
          DATABASE_VERSION,
          payload,
          updatedAt,
        );
      });
    });
  }

  clear(): Promise<void> {
    return this.enqueueWrite(async () => {
      const database = await this.getDatabase();
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync('DELETE FROM app_state WHERE id = 1');
      });
    });
  }

  private enqueueWrite(task: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.catch(() => undefined).then(task);
    this.writeQueue = next;
    return next;
  }

  private getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = this.openDatabase().catch((error) => {
        this.databasePromise = null;
        throw error;
      });
    }
    return this.databasePromise;
  }

  private async openDatabase(): Promise<SQLite.SQLiteDatabase> {
    const key = await getOrCreateDatabaseKey();
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // SQLCipher requires the key immediately after opening the connection.
    await database.execAsync(`PRAGMA key = '${key}'`);
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        schema_version INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
    return database;
  }
}

export const appRepository: AppRepository = new SQLiteAppRepository();
