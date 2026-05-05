import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========== USUÁRIOS ==========
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  openId: text('open_id').notNull().unique(),
  name: text('name'),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== CONVERSAS ==========
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').default('Nova conversa'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== MENSAGENS ==========
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  type: text('type', { enum: ['text', 'thought', 'plan', 'result', 'output', 'error', 'image'] }).default('text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== TAREFAS ==========
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').references(() => conversations.id),
  type: text('type', { enum: ['shell', 'browser', 'filesystem', 'ai', 'desktop_click', 'desktop_type', 'desktop_screenshot'] }).notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).default('pending'),
  params: text('params'), // JSON string
  result: text('result'),
  output: text('output'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== MEMÓRIA DO AGENTE ==========
export const agentMemory = sqliteTable('agent_memory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['preference', 'lesson', 'context', 'skill'] }).notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== LIÇÕES APRENDIDAS ==========
export const learnedLessons = sqliteTable('learned_lessons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  context: text('context'),
  errorType: text('error_type'),
  errorMessage: text('error_message'),
  reflection: text('reflection'),
  lesson: text('lesson'),
  correction: text('correction'),
  timesEncountered: integer('times_encountered').default(1),
  lastEncountered: integer('last_encountered', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ========== PONTUAÇÃO DE PLANOS ==========
export const planScores = sqliteTable('plan_scores', {
  goalPattern: text('goal_pattern').primaryKey(),
  actionPlan: text('action_plan'),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  totalScore: real('total_score').default(0),
  lastUsed: integer('last_used', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastFeedback: text('last_feedback'),
});

// ========== PREFERÊNCIAS DO USUÁRIO ==========
export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  preferredModel: text('preferred_model').default('ollama'),
  agentPersona: text('agent_persona').default('assistant'),
  temperature: integer('temperature').default(70),
  maxTokens: integer('max_tokens').default(2000),
  systemPrompt: text('system_prompt'),
});