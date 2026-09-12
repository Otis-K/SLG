import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  auth: {
    tokenSecret: process.env.AUTH_TOKEN_SECRET ?? 'slg-local-secret-change-me',
    tokenTtlDays: Number(process.env.AUTH_TOKEN_TTL_DAYS ?? 30),
  },
  sms: {
    debug: String(process.env.SMS_DEBUG ?? 'true') === 'true',
    codeTtlMinutes: Number(process.env.SMS_CODE_TTL_MINUTES ?? 5),
  },
  ai: {
    provider: process.env.AI_PROVIDER ?? 'mock',
    apiKey: process.env.AI_API_KEY ?? '',
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.AI_MODEL ?? 'gpt-4.1-mini',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
  },
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'slg',
  },
};
