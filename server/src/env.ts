import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'

// 优先加载工程根目录 .env，再加载 server/.env
const rootEnv = path.resolve(process.cwd(), '../.env')
const localEnv = path.resolve(process.cwd(), '.env')
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv })
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv, override: false })

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (!v) {
    throw new Error(`Missing required env: ${name}`)
  }
  return v
}

export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',

  API_KEY: required('API_KEY'),
  ARK_BASE_URL: process.env.ARK_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
  ARK_MODEL: process.env.ARK_MODEL ?? 'doubao-seed-2.0-pro',

  JWT_SECRET: required('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '30d',

  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
}
