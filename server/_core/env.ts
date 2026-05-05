import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'ollama',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma2:2b',
  BUILT_IN_FORGE_API_KEY: process.env.BUILT_IN_FORGE_API_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
} as const;