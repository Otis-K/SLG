import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { createDatabasePool, createRequestLog, getDatabaseStatus } from './db.js';
import { readBootstrapFixture } from './bootstrapData.js';
import { createPlanSuggestion, createActivationResult } from './plan.js';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json());

const pool = await createDatabasePool();

type Account = RowDataPacket & { id: string };

async function accountIdFrom(req: Request): Promise<string> {
  const provided = String((req.headers['x-account-id'] as string) ?? req.query.accountId ?? 'demo-account-01');
  await pool.execute('INSERT IGNORE INTO accounts (id, status) VALUES (?, ?)', [provided, 'active']);
  return provided;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringsToNumbers(rows: any[], fields: string[]) {
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      if (next[field] !== null && next[field] !== undefined) next[field] = Number(next[field]);
    }
    return next;
  });
}

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: '食练格后端服务',
    version: '0.1.0',
    endpoints: [
      '/health',
      '/api/v1/app-bootstrap',
      '/api/v1/plan-suggestions',
      '/api/v1/plans/activate',
      '/api/v1/profile',
      '/api/v1/foods/search',
      '/api/v1/meal-entries',
      '/api/v1/workout-sessions',
      '/api/v1/body-metrics',
      '/api/v1/backup-snapshots',
    ],
  });
});

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const database = await getDatabaseStatus(pool);
    res.json({ status: 'ok', database });
  } catch (error) {
    res.status(503).json({ status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/app-bootstrap', async (req: Request, res: Response) => {
  const localDate = typeof req.query.localDate === 'string' ? req.query.localDate : '';
  try {
    await createRequestLog(pool, req.path, localDate);
    const fixture = readBootstrapFixture();
    res.json({
      ...fixture,
      source: 'api',
      requestId: `req-${Date.now()}`,
    });
  } catch (error) {
    res.status(500).json({
      schemaVersion: 'app-bootstrap-v1',
      source: 'api',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/v1/plan-suggestions', async (req: Request, res: Response) => {
  try {
    const suggestion = createPlanSuggestion(req.body?.profile ?? {});
    res.json(suggestion);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/plans/activate', async (req: Request, res: Response) => {
  try {
    const activation = createActivationResult(req.body ?? {});
    const accountId = await accountIdFrom(req);
    const today = new Date().toISOString().slice(0, 10);
    await pool.execute(
      'INSERT INTO nutrition_plan_versions (id, account_id, status, effective_from_local_date, targets, meal_budgets) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), accountId, 'active', today, JSON.stringify(activation.targets), JSON.stringify([])],
    );
    res.json({ data: activation });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/profile', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE account_id = ?', [accountId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({ data: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/v1/profile', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    await pool.execute(
      `INSERT INTO profiles
        (account_id, user_id, display_name, avatar_text, goal_label, units, age, sex, height_cm, latest_weight_kg, target_weight_kg, goal, pace, activity, experience, training_days, training_place, session_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        user_id=VALUES(user_id), display_name=VALUES(display_name), avatar_text=VALUES(avatar_text), goal_label=VALUES(goal_label), units=VALUES(units), age=VALUES(age), sex=VALUES(sex), height_cm=VALUES(height_cm), latest_weight_kg=VALUES(latest_weight_kg), target_weight_kg=VALUES(target_weight_kg), goal=VALUES(goal), pace=VALUES(pace), activity=VALUES(activity), experience=VALUES(experience), training_days=VALUES(training_days), training_place=VALUES(training_place), session_minutes=VALUES(session_minutes)`,
      [
        accountId,
        body.userId ?? accountId,
        body.displayName ?? '用户',
        body.avatarText ?? '用',
        body.goalLabel ?? '',
        body.units ?? 'metric',
        body.age ?? null,
        body.sex ?? null,
        body.heightCm ?? null,
        body.latestWeightKg ?? null,
        body.targetWeightKg ?? null,
        body.goal ?? null,
        body.pace ?? null,
        body.activity ?? null,
        body.experience ?? null,
        body.trainingDays ?? null,
        body.trainingPlace ?? null,
        body.sessionMinutes ?? null,
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM profiles WHERE account_id = ?', [accountId]);
    return res.json({ data: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/foods/search', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const accountId = await accountIdFrom(req);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, detail, unit, amount, calories, protein, carbs, fat, tone, favorite, is_custom
       FROM foods
       WHERE account_id = ? AND (name LIKE ? OR detail LIKE ?)
       ORDER BY favorite DESC, name ASC
       LIMIT 50`,
      [accountId, `%${q}%`, `%${q}%`],
    );
    return res.json({ data: stringsToNumbers(rows, ['amount', 'calories', 'protein', 'carbs', 'fat']) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/foods', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    const id = String(body.id ?? randomUUID());
    await pool.execute(
      `INSERT INTO foods
        (id, account_id, source, name, detail, unit, amount, calories, protein, carbs, fat, tone, favorite, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), detail=VALUES(detail), unit=VALUES(unit), amount=VALUES(amount), calories=VALUES(calories), protein=VALUES(protein), carbs=VALUES(carbs), fat=VALUES(fat), tone=VALUES(tone), favorite=VALUES(favorite), is_custom=VALUES(is_custom)`,
      [
        id, accountId, body.source ?? 'custom', body.name ?? '', body.detail ?? '', body.unit ?? '份',
        numberOr(body.amount, 1), numberOr(body.calories, 0), numberOr(body.protein, 0), numberOr(body.carbs, 0), numberOr(body.fat, 0),
        body.tone ?? 'neutral', body.favorite ? 1 : 0, body.isCustom ? 1 : 0,
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM foods WHERE id = ?', [id]);
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/meal-entries', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const localDate = typeof req.query.localDate === 'string' ? req.query.localDate : new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM meal_entries WHERE account_id = ? AND local_date = ? AND deleted_at IS NULL ORDER BY recorded_at ASC`,
      [accountId, localDate],
    );
    return res.json({ data: rows });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/meal-entries', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    const entryId = String(body.entryId ?? randomUUID());
    const localDate = String(body.localDate ?? new Date().toISOString().slice(0, 10));
    await pool.execute(
      `INSERT INTO meal_entries
        (account_id, entry_id, food_id, name, detail, unit, amount, calories, protein, carbs, fat, tone, meal_id, local_date, time_zone_id, utc_offset_minutes, occurred_at_utc, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), detail=VALUES(detail), unit=VALUES(unit), amount=VALUES(amount), calories=VALUES(calories), protein=VALUES(protein), carbs=VALUES(carbs), fat=VALUES(fat), tone=VALUES(tone), meal_id=VALUES(meal_id), local_date=VALUES(local_date), time_zone_id=VALUES(time_zone_id), utc_offset_minutes=VALUES(utc_offset_minutes), occurred_at_utc=VALUES(occurred_at_utc), recorded_at=VALUES(recorded_at)`,
      [
        accountId, entryId, body.foodId ?? null, body.name ?? '', body.detail ?? '', body.unit ?? '份',
        numberOr(body.amount, 1), numberOr(body.calories, 0), numberOr(body.protein, 0), numberOr(body.carbs, 0), numberOr(body.fat, 0),
        body.tone ?? 'neutral', body.mealId ?? 'snack', localDate, body.timeZoneId ?? 'Asia/Shanghai',
        Number(body.utcOffsetMinutes ?? 480), new Date(body.occurredAtUtc ?? Date.now()), new Date(body.recordedAt ?? Date.now()),
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM meal_entries WHERE account_id = ? AND entry_id = ?', [accountId, entryId]);
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/v1/meal-entries/:entryId', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    await pool.execute(
      `UPDATE meal_entries
       SET food_id=?, name=?, detail=?, unit=?, amount=?, calories=?, protein=?, carbs=?, fat=?, tone=?, meal_id=?, local_date=?
       WHERE account_id=? AND entry_id=?`,
      [
        body.foodId ?? null, body.name ?? '', body.detail ?? '', body.unit ?? '份', numberOr(body.amount, 1),
        numberOr(body.calories, 0), numberOr(body.protein, 0), numberOr(body.carbs, 0), numberOr(body.fat, 0),
        body.tone ?? 'neutral', body.mealId ?? 'snack', body.localDate ?? new Date().toISOString().slice(0, 10),
        accountId, req.params.entryId,
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM meal_entries WHERE account_id = ? AND entry_id = ?', [accountId, req.params.entryId]);
    return res.json({ data: rows[0] ?? null });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/v1/meal-entries/:entryId', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE meal_entries SET deleted_at=NOW(3) WHERE account_id=? AND entry_id=?',
      [accountId, req.params.entryId],
    );
    return res.json({ data: { affectedRows: result.affectedRows } });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/workout-sessions', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const localDate = typeof req.query.localDate === 'string' ? req.query.localDate : new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM workout_sessions WHERE account_id = ? AND local_date = ? ORDER BY created_at DESC`,
      [accountId, localDate],
    );
    return res.json({ data: rows });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/workout-sessions', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    const sessionId = String(body.sessionId ?? randomUUID());
    await pool.execute(
      `INSERT INTO workout_sessions
        (account_id, session_id, title, status, active, completed, local_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status), active=VALUES(active), completed=VALUES(completed), local_date=VALUES(local_date)`,
      [
        accountId, sessionId, body.title ?? '训练', body.status ?? 'active', body.active ? 1 : 0, body.completed ? 1 : 0,
        body.localDate ?? new Date().toISOString().slice(0, 10),
      ],
    );
    for (const exercise of Array.isArray(body.exercises) ? body.exercises : []) {
      if (!exercise) continue;
      await pool.execute(
        `INSERT INTO workout_sets
          (workout_session_id, set_id, exercise_id, exercise_name, note, weight, reps, target_reps, done, sort_order)
         SELECT id, ?, COALESCE(?, ''), ?, ?, ?, ?, ?, ?, ?
         FROM workout_sessions WHERE account_id=? AND session_id=?
         ON DUPLICATE KEY UPDATE exercise_name=VALUES(exercise_name), note=VALUES(note), weight=VALUES(weight), reps=VALUES(reps), target_reps=VALUES(target_reps), done=VALUES(done), sort_order=VALUES(sort_order)`,
        [
          randomUUID(), exercise.id ?? '', exercise.name ?? '', exercise.note ?? '', numberOr(exercise.weight, 0),
          numberOr(exercise.reps, 0), exercise.targetReps ?? null, exercise.done ? 1 : 0, exercise.sortOrder ?? 0,
          accountId, sessionId,
        ],
      );
    }
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM workout_sessions WHERE account_id = ? AND session_id = ?', [accountId, sessionId]);
    return res.status(201).json({ data: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.patch('/api/v1/workout-sessions/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    await pool.execute(
      `UPDATE workout_sessions SET completed=1, active=0, status='completed', completed_at=NOW(3) WHERE account_id=? AND session_id=?`,
      [accountId, req.params.sessionId],
    );
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM workout_sessions WHERE account_id = ? AND session_id = ?', [accountId, req.params.sessionId]);
    return res.json({ data: rows[0] ?? null });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/body-metrics', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM body_metrics WHERE account_id = ? ORDER BY occurred_at_utc DESC LIMIT 100`,
      [accountId],
    );
    return res.json({ data: rows });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/body-metrics', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    await pool.execute(
      `INSERT INTO body_metrics (account_id, metric_type, value, unit, local_date, occurred_at_utc, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId, body.metricType ?? 'weight', numberOr(body.value, 0), body.unit ?? 'kg',
        body.localDate ?? new Date().toISOString().slice(0, 10), new Date(body.occurredAtUtc ?? Date.now()), body.source ?? 'manual',
      ],
    );
    return res.status(201).json({ data: body });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/v1/backup-snapshots', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const body = req.body ?? {};
    const status = String(body.status ?? 'created');
    const finalizedAt = status === 'authoritative' ? new Date() : null;
    await pool.execute(
      `INSERT INTO backup_snapshots
        (account_id, schema_version, app_version, backup_epoch, local_generation, record_counts, content_sha256, status, authoritative, finalized_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status=VALUES(status), authoritative=VALUES(authoritative), finalized_at=IF(VALUES(status) = 'authoritative', NOW(3), NULL)`,
      [
        accountId, body.schemaVersion ?? 'app-state-v1', body.appVersion ?? '0.1.0',
        body.backupEpoch ?? 1, body.localGeneration ?? 1, JSON.stringify(body.recordCounts ?? null),
        body.contentSha256 ?? '', status, status === 'authoritative' ? 1 : 0, finalizedAt,
      ],
    );
    return res.status(201).json({ data: body });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/v1/backup-snapshots/latest', async (req: Request, res: Response) => {
  try {
    const accountId = await accountIdFrom(req);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM backup_snapshots WHERE account_id = ? ORDER BY id DESC LIMIT 1`,
      [accountId],
    );
    return res.json({ data: rows[0] ?? null });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(config.port, () => {
  console.log(`食练格后端服务已启动：http://127.0.0.1:${config.port}`);
  console.log(`MySQL 数据库：${config.mysql.database}@${config.mysql.host}:${config.mysql.port}`);
});
