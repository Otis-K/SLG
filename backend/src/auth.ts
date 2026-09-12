import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';
import { HttpError } from './errors.js';

export type AccessTokenPayload = {
  sub: string;
  phoneHash: string;
  role: string;
  iat: number;
  exp: number;
};

type AccountRow = RowDataPacket & {
  id: string;
  phone_hash: string | null;
  status: string;
};

type ProfileRow = RowDataPacket & {
  account_id: string;
  display_name: string;
  onboarding_completed: number;
};

const secret = Buffer.from(config.auth.tokenSecret);
const tokenTtlMs = config.auth.tokenTtlDays * 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function base64url(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64url');
}

function normalizePhone(phone: string): string {
  const normalized = String(phone || '').replace(/[^\d]/g, '');
  if (!/^1[3-9]\d{9}$/.test(normalized)) {
    throw new HttpError(400, 'INVALID_PHONE', '请输入正确的 11 位大陆手机号');
  }
  return normalized;
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function createAccessToken(payload: { sub: string; phoneHash: string }): string {
  const now = Date.now();
  const tokenPayload: AccessTokenPayload = {
    sub: payload.sub,
    phoneHash: payload.phoneHash,
    role: 'user',
    iat: now,
    exp: now + tokenTtlMs,
  };
  const body = base64url(JSON.stringify(tokenPayload));
  const signature = createHash('sha256')
    .update(`${body}.${config.auth.tokenSecret}`)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const [body = '', signature = ''] = String(token || '').split('.');
  if (!body || !signature) throw new HttpError(401, 'UNAUTHENTICATED', '登录状态无效，请重新登录');

  const expected = createHash('sha256')
    .update(`${body}.${config.auth.tokenSecret}`)
    .digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new HttpError(401, 'UNAUTHENTICATED', '登录状态无效，请重新登录');
  }

  let payload: Partial<AccessTokenPayload> | null = null;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    payload = null;
  }

  if (!payload?.sub || !payload.exp || payload.exp <= Date.now()) {
    throw new HttpError(401, 'TOKEN_EXPIRED', '登录已过期，请重新登录');
  }

  return payload as AccessTokenPayload;
}

function codeHash(phone: string, code: string): string {
  return sha256(`${normalizePhone(phone)}:${code}:${config.auth.tokenSecret}`);
}

export async function createSmsCode(pool: Pool, phone: string): Promise<{ expiresAt: Date; code: string; debug: boolean }> {
  const recipient = normalizePhone(phone);
  const code = config.sms.debug ? '123456' : String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + config.sms.codeTtlMinutes * 60 * 1000);
  await pool.execute(
    `INSERT INTO sms_verification_codes
      (recipient, purpose, code_hash, expires_at)
     VALUES (?, 'login', ?, ?)`,
    [recipient, codeHash(recipient, code), expiresAt],
  );
  return { expiresAt, code, debug: config.sms.debug };
}

export async function verifySmsCode(pool: Pool, phone: string, code: string): Promise<boolean> {
  const recipient = normalizePhone(phone);
  const expectedHash = codeHash(recipient, String(code || '').trim());
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT *
     FROM sms_verification_codes
     WHERE recipient = ? AND purpose = 'login'
     ORDER BY id DESC
     LIMIT 1`,
    [recipient],
  );
  const row = rows[0];
  if (!row) return false;
  if (row.consumed_at || row.attempts >= 5 || new Date(row.expires_at).getTime() < Date.now()) return false;

  await pool.execute('UPDATE sms_verification_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
  if (row.code_hash !== expectedHash) return false;

  await pool.execute('UPDATE sms_verification_codes SET consumed_at = NOW(3) WHERE id = ?', [row.id]);
  return true;
}

export async function findOrCreateAccountByPhone(pool: Pool, phone: string): Promise<AccountRow> {
  const normalized = normalizePhone(phone);
  const phoneHash = sha256(normalized);
  const accountId = randomUUID();
  await pool.execute(
    `INSERT INTO accounts (id, phone_hash, status)
     VALUES (?, ?, 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    [accountId, phoneHash],
  );
  const [rows] = await pool.query<AccountRow[]>(
    'SELECT * FROM accounts WHERE phone_hash = ?',
    [phoneHash],
  );
  if (!rows[0]) throw new HttpError(500, 'ACCOUNT_CREATE_FAILED', '账号创建失败，请重试');
  return rows[0];
}

export async function getAccountAuthState(pool: Pool, accountId: string) {
  const [profiles] = await pool.query<ProfileRow[]>(
    `SELECT account_id, display_name, onboarding_completed
     FROM profiles
     WHERE account_id = ?`,
    [accountId],
  );
  const profile = profiles[0] ?? null;
  return {
    onboardingCompleted: profile ? Boolean(profile.onboarding_completed) : false,
    displayName: profile?.display_name ?? '新用户',
  };
}
