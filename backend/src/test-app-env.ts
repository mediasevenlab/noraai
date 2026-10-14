import type { AppEnv } from './env'

/** Shared AppEnv defaults for unit/integration tests that construct env by hand. */
export function testAppEnv(overrides: Partial<AppEnv> & Pick<AppEnv, 'DATABASE_URL' | 'JWT_SECRET'>): AppEnv {
  return {
    PORT: 3000,
    CORS_ORIGINS: ['http://localhost:5173'],
    ACCESS_TOKEN_TTL_SECONDS: 60,
    REFRESH_TOKEN_TTL_DAYS: 30,
    REFRESH_REUSE_GRACE_SECONDS: 10,
    SESSION_ABSOLUTE_TTL_DAYS: 90,
    SESSION_RETENTION_DAYS: 7,
    AUTH_BODY_LIMIT_BYTES: 64 * 1024,
    AUTH_RATE_LIMIT_MAX: 60,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
    INTERNAL_RATE_LIMIT_MAX: 120,
    INTERNAL_RATE_LIMIT_WINDOW_SECONDS: 60,
    SHUTDOWN_GRACE_SECONDS: 20,
    TRUST_PROXY: false,
    COOKIE_SECURE: false,
    SPACES_UPLOAD_MAX_BYTES: 10 * 1024 * 1024,
    SPACES_UPLOAD_URL_TTL_SECONDS: 900,
    SPACES_DOWNLOAD_URL_TTL_SECONDS: 300,
    SPACES_PUBLIC_CACHE_CONTROL: 'public, max-age=31536000, immutable',
    GEMINI_MODEL: 'gemini-2.5-flash',
    LLM_TEXT_MODEL: 'qwen2.5:7b',
    LLM_VISION_MODEL: 'qwen2.5vl:3b',
    GEMINI_API_HOST: 'generativelanguage.googleapis.com',
    GEMINI_API_PORT: 443,
    ...overrides,
  }
}
