import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { llmClient } from './_core/llm';
import { db } from './db';
import { conversations, messages, tasks, agentMemory, learnedLessons, planScores, userPreferences } from '../drizzle/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';
import { desktopClick, desktopType, desktopScreenshot } from './tasks/desktop';
import { browseWeb, loginManually } from './tasks/browser';
import { listFiles, organizeFiles, createFile, getSystemInfo } from './tasks/filesystem';
import { reflectOnFailure, adjustPlanScore, detectFeedbackSignal, saveMemory, getRelevantLessons } from './tasks/learning';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chatRouter = router({
  sendMessage: publicProcedure
    .input(z.object({
      conversationId: z.number().optional(),
      message: z.string(),
      model: z.enum(['gemini', 'ollama']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { conversationId, message, model } = input;
      const userId = ctx.user?.id || 'default';

      // Criar ou obter conversa
      let convId = conversationId;
      if (!convId) {
        const [conv] = await db.insert(conversations).values({
          userId,
          title: message.substring(0, 50),
        }).returning();
        convId = conv.id;
      }

      // Salvar mensagem do usuário
      await db.insert(messages).values({
        conversationId: convId,
        role: 'user',
        content: message,
        type: 'text',
      });

      // Processar resposta
      const response = await processMessage(message, model, userId, convId);

      return {
        conversationId: convId,
        ...response,
      };
    }),

  listConversations: publicProcedure
    .input(z.object({ userId: z.string().default('default') }))
    .query(async ({ input }) => {
      return await db.select().from(conversations)
        .where(eq(conversations.userId, input.userId))
        .orderBy(desc(conversations.createdAt));
    }),

  getMessages: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return await db.select().from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt);
    }),

  createConversation: publicProcedure
    .input(z.object({ title: z.string(), userId: z.string().default('default') }))
    .mutation(async ({ input }) => {
      const [conv] = await db.insert(conversations).values(input).returning();
      return conv;
    }),
});

const memoryRouter = router({
  getMemory: publicProcedure
    .input(z.object({ userId: z.string().default('default'), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return await db.select().from(agentMemory)
        .where(eq(agentMemory.userId, input.userId))
        .orderBy(desc(agentMemory.createdAt))
        .limit(input.limit);
    }),

  saveMemory: publicProcedure
    .input(z.object({
      type: z.enum(['preference', 'lesson', 'context', 'skill']),
      content: z.string(),
      userId: z.string().default('default'),
    }))
    .mutation(async ({ input }) => {
      await saveMemory(input.type, input.content, input.userId);
      return { success: true };
    }),
});

const preferencesRouter = router({
  getPreferences: publicProcedure
    .input(z.object({ userId: z.string().default('default') }))
    .query(async ({ input }) => {
      const prefs = await db.select().from(userPreferences)
        .where(eq(userPreferences.userId, input.userId));
      return prefs[0] || { userId: input.userId, theme: 'light', language: 'pt-BR' };
    }),

  updatePreferences: publicProcedure
    .input(z.object({
      userId: z.string().default('default'),
      theme: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, ...updates } = input;
      await db.update(userPreferences)
        .set(updates)
        .where(eq(userPreferences.userId, userId));
      return { success: true };
    }),
});

export const appRouter = router({
  chat: chatRouter,
  memory: memoryRouter,
  preferences: preferencesRouter,

  // ========== TAREFAS ==========
  getTasks: publicProcedure
    .input(z.object({ conversationId: z.number().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { conversationId, limit } = input;
      let query = db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(limit);
      if (conversationId) {
        query = query.where(eq(tasks.conversationId, conversationId));
      }
      return await query;
    }),

  // ========== LIÇÕES ==========
  getLessons: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async () => {
      return await db.select().from(learnedLessons)
        .orderBy(desc(learnedLessons.lastEncountered))
        .limit(input.limit);
    }),

  // ========== AÇÕES DO SISTEMA ==========
  executeAction: publicProcedure
    .input(z.object({
      action: z.enum(['system_info', 'list_files', 'organize_files', 'create_file', 'run_shell', 'desktop_click', 'desktop_type', 'desktop_screenshot']),
      params: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { action, params = {} } = input;
      let result = '', output = '';

      try {
        switch (action) {
          case 'system_info':
            output = getSystemInfo();
            result = '✅ Informações do sistema coletadas';
            break;
          case 'list_files':
            output = listFiles(params.path);
            result = '✅ Arquivos listados';
            break;
          case 'organize_files':
            output = organizeFiles(params.path);
            result = '✅ Arquivos organizados';
            break;
          case 'create_file':
            output = createFile(params.name, params.content, params.path);
            result = '✅ Arquivo criado';
            break;
          case 'run_shell':
            output = execSync(params.command, { encoding: 'utf8', timeout: 30000 });
            result = '✅ Comando executado';
            break;
          case 'desktop_click':
            output = await desktopClick({ x: params.x, y: params.y });
            result = '✅ Clique executado';
            break;
          case 'desktop_type':
            output = await desktopType({ text: params.text });
            result = '✅ Texto digitado';
            break;
          case 'desktop_screenshot': {
            const r = await desktopScreenshot();
            output = r.output;
            result = '✅ Screenshot salvo';
            break;
          }
        }
      } catch (e: any) {
        output = e.message;
        result = '❌ Erro';
      }

      return { result, output };
    }),

  // ========== NAVEGAÇÃO ==========
  browseWeb: publicProcedure
    .input(z.object({
      url: z.string(),
      action: z.enum(['click', 'fill', 'get_text']).optional(),
      selector: z.string().optional(),
      value: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await browseWeb(input.url, input.action, input.selector, input.value);
    }),

  loginManual: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input }) => {
      return await loginManually(input.url);
    }),

  // ========== FEEDBACK ==========
  sendFeedback: publicProcedure
    .input(z.object({
      message: z.string(),
      lastGoal: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const signal = detectFeedbackSignal(input.message);
      if (signal && input.lastGoal) {
        await adjustPlanScore(input.lastGoal, signal.strength);
        return {
          type: signal.type,
          message: signal.type === 'positive'
            ? '🙏 Obrigado! Comportamento reforçado.'
            : '📝 Entendido. Ajustarei minha abordagem.',
        };
      }
      return { type: 'neutral', message: 'Feedback registrado.' };
    }),
});

// ============ FUNÇÃO DE PROCESSAMENTO PRINCIPAL ============
async function processMessage(
  message: string,
  model?: string,
  userId: string = 'default',
  conversationId?: number
): Promise<{ thought?: string; plan?: string[]; result?: string; output?: string; error?: string }> {
  const lower = message.toLowerCase();

  // Saudações
  const saudacoes = ['bom dia', 'boa tarde', 'boa noite', 'olá', 'ola', 'oi', 'oie', 'e aí', 'hello', 'hi', 'fala'];
  if (saudacoes.some(s => lower.startsWith(s))) {
    const hora = new Date().getHours();
    let periodo = hora < 12 ? 'dia' : hora < 18 ? 'tarde' : 'noite';
    return {
      result: `👋 Olá, senhor! Boa ${periodo}!`,
      output: 'Estou pronto para ajudar. Use "ajuda" para ver os comandos disponíveis.',
    };
  }

  // Feedback
  const feedback = detectFeedbackSignal(message);
  if (feedback) {
    const lastMsg = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId || 0))
      .orderBy(desc(messages.createdAt))
      .limit(1).get();
    if (lastMsg) {
      await adjustPlanScore(lastMsg.content, feedback.strength);
    }
    return {
      result: feedback.type === 'positive' ? '🙏 Obrigado! Comportamento reforçado.' : '📝 Entendido. Ajustarei minha abordagem.',
    };
  }

  // Aprendizado explícito
  const aprendizadoPatterns = [
    /aprenda que (.+)/i, /lembre-se que (.+)/i, /lembre que (.+)/i,
    /guarde que (.+)/i, /anote que (.+)/i, /guarda essa informação:?\s*(.+)/i,
    /meu nome é (.+)/i, /eu me chamo (.+)/i, /eu sou (.+)/i,
    /a partir de agora (.+)/i, /sempre que (.+)/i,
  ];

  for (const pattern of aprendizadoPatterns) {
    const match = message.match(pattern);
    if (match) {
      const fact = match[1].trim().replace(/[.!?]+$/, '');
      await saveMemory('preference', fact, userId);
      return {
        result: '✅ Informação aprendida!',
        output: `📚 Aprendi: "${fact}"`,
      };
    }
  }

  // Perguntas sobre habilidades
  if (lower.includes('quais habilidades') || lower.includes('o que você sabe fazer') ||
      lower.includes('o que voce sabe fazer') || lower.includes('suas habilidades')) {
    const memories = await db.select().from(agentMemory)
      .where(eq(agentMemory.userId, userId))
      .orderBy(desc(agentMemory.createdAt))
      .limit(10);
    const skills = memories.length > 0
      ? memories.map(m => `• ${m.content}`).join('\n')
      : 'Ainda estou aprendendo. Use "aprenda que [fato]" para me ensinar.';
    return {
      result: '🤖 Aqui está o que eu sei até agora:',
      output: `Habilidades aprendidas:\n${skills}`,
    };
  }

  // Recuperar conhecimento
  if (lower.includes('o que você sabe sobre')) {
    const topicMatch = message.match(/sobre (.+)/i);
    if (topicMatch) {
      const results = await db.select().from(agentMemory)
        .where(or(
          like(agentMemory.content, `%${topicMatch[1].trim()}%`),
          like(agentMemory.type, '%')
        ))
        .limit(5);
      if (results.length === 0) return { result: `🤔 Nada sobre "${topicMatch[1].trim()}"`, output: 'Use "aprenda que [fato]" para me ensinar.' };
      return { result: '📚 Conhecimentos:', output: results.map(r => `• ${r.content}`).join('\n') };
    }
  }

  // Lições aprendidas
  if (lower.includes('o que você aprendeu') || lower.includes('quais lições')) {
    const lessons = await db.select().from(learnedLessons).orderBy(desc(learnedLessons.lastEncountered)).limit(10);
    if (lessons.length === 0) return { result: '📚 Ainda estou aprendendo...', output: 'Não coletei lições suficientes ainda.' };
    return {
      result: `📚 Últimas ${lessons.length} lições:`,
      output: lessons.map(l => `🔹 [${l.errorType}] ${l.lesson}\n   Correção: ${l.correction}`).join('\n\n'),
    };
  }

  // Classificação de intenção
  let intent: string;
  try {
    intent = await llmClient.classifyIntent(message);
  } catch {
    intent = 'knowledge'; // fallback
  }

  // Roteamento por intenção
  switch (intent) {
    case 'action': {
      const actionPlan = await llmClient.generateActionPlan(message);
      if (actionPlan) {
        return await executeActionPlan(actionPlan, userId, conversationId);
      }
      return await executeLocalAction(message);
    }
    case 'learn':
      return await executeLocalAction(message);
    case 'knowledge':
    default: {
      try {
        const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
        const personaPrompt = prefs?.systemPrompt || 'Você é o STOLL, um assistente virtual brasileiro prestativo e eficiente.';
        const answer = await llmClient.answerQuestion(message, personaPrompt);
        return { result: answer, output: answer };
      } catch {
        return await executeLocalAction(message);
      }
    }
  }
}

// ============ EXECUTOR DE PLANO DE AÇÃO ============
async function executeActionPlan(
  plan: any,
  userId: string,
  conversationId?: number
): Promise<{ thought?: string; plan?: string[]; result?: string; output?: string; error?: string }> {
  const { thought, plan: steps, action, params = {} } = plan;
  let result = '', output = '';

  try {
    switch (action) {
      case 'system_info': output = getSystemInfo(); result = '✅ Informações do sistema'; break;
      case 'list_files': output = listFiles(params.path); result = '✅ Arquivos listados'; break;
      case 'organize_files': output = organizeFiles(params.path); result = '✅ Arquivos organizados'; break;
      case 'create_file': output = createFile(params.name, params.content, params.path); result = '✅ Arquivo criado'; break;
      case 'run_shell': output = execSync(params.command, { encoding: 'utf8', timeout: 30000 }); result = '✅ Comando executado'; break;
      case 'browse_web': {
        const r = await browseWeb(params.url, params.action, params.selector, params.value);
        output = r.output; result = r.result;
        break;
      }
      case 'desktop_click': output = await desktopClick({ x: params.x, y: params.y }); result = '✅ Clique executado'; break;
      case 'desktop_type': output = await desktopType({ text: params.text }); result = '✅ Texto digitado'; break;
      case 'desktop_screenshot': {
        const r = await desktopScreenshot();
        output = r.output; result = '✅ Screenshot salvo';
        break;
      }
      default: output = `Ação: ${action}`; result = '✅';
    }
    await adjustPlanScore(message, 1);
  } catch (e: any) {
    output = e.message;
    result = '❌ Erro';
    await reflectOnFailure(message, e.message, action);
    await adjustPlanScore(message, -1);
  }

  // Salvar tarefa
  if (conversationId) {
    await db.insert(tasks).values({
      conversationId,
      type: action,
      status: result?.includes('❌') ? 'failed' : 'completed',
      params: JSON.stringify(params),
      result,
      output,
      error: result?.includes('❌') ? output : undefined,
    });
  }

  return { thought, plan: steps, result, output };
}

// ============ EXECUTOR DE AÇÃO LOCAL ============
async function executeLocalAction(message: string): Promise<any> {
  const lower = message.toLowerCase();

  if (lower.includes('status') && lower.includes('sistema')) {
    return { thought: 'Coletando status...', plan: ['Verificar sistema'], result: '✅ Status coletado', output: getSystemInfo() };
  }

  if (lower.includes('listar') || lower.includes('mostrar') || lower.includes('ver')) {
    let p = os.homedir();
    if (lower.includes('desktop') || lower.includes('área de trabalho')) p = path.join(os.homedir(), 'Desktop');
    else if (lower.includes('downloads')) p = path.join(os.homedir(), 'Downloads');
    return { thought: 'Listando...', plan: ['Acessar diretório', 'Listar conteúdo'], result: '✅ Lista gerada', output: listFiles(p) };
  }

  if (lower.includes('criar') && lower.includes('pasta')) {
    const match = message.match(/(?:pasta|diretório|folder)\s+(?:chamada|nomeada)?\s*['"]?([^'"]+)['"]?/i);
    const name = match ? match[1].trim() : 'nova_pasta';
    let p = os.homedir();
    if (lower.includes('desktop')) p = path.join(os.homedir(), 'Desktop');
    fs.mkdirSync(path.join(p, name), { recursive: true });
    return { thought: `Criando "${name}"...`, plan: ['mkdir'], result: `✅ Pasta "${name}" criada!`, output: `📁 ${path.join(p, name)}` };
  }

  if (lower.includes('organizar') || lower.includes('arrumar')) {
    let p = path.join(os.homedir(), 'Desktop');
    if (lower.includes('downloads')) p = path.join(os.homedir(), 'Downloads');
    return { thought: 'Organizando...', plan: ['Categorizar', 'Mover'], result: '✅ Organizado!', output: organizeFiles(p) };
  }

  if (lower.includes('memória') || lower.includes('ram')) {
    const total = os.totalmem(), free = os.freemem(), used = total - free, pct = ((used / total) * 100).toFixed(1);
    return { result: '✅ Memória verificada', output: `🧠 RAM\nTotal: ${(total / 1024 ** 3).toFixed(2)} GB\nEm uso: ${(used / 1024 ** 3).toFixed(2)} GB (${pct}%)` };
  }

  if (lower.includes('ajuda') || lower.includes('help') || lower.includes('comandos')) {
    return {
      result: '📚 Comandos disponíveis',
      output: [
        '📊 status do sistema',
        '🧠 uso de memória',
        '📁 listar arquivos no desktop',
        '🗂️ organizar desktop',
        '📁 criar pasta teste no desktop',
        '💻 echo Hello World',
        '🌐 acesse https://...',
        '📱 login no Instagram',
        '🧠 aprenda que [fato]',
        '📚 o que você sabe sobre [tópico]',
        '🖼️ crie uma imagem de...',
        '❓ ajuda',
      ].join('\n'),
    };
  }

  return { error: `Não reconheci: "${message}". Digite "ajuda".` };
}

export type AppRouter = typeof appRouter;