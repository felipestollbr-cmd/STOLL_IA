import { getDb } from '../db';
import { learnedLessons, planScores, agentMemory } from '../../drizzle/schema';
import { eq, or, like, desc, sql } from 'drizzle-orm';
import { llmClient } from '../_core/llm';

export async function reflectOnFailure(goal: string, errorMsg: string, action: string) {
  const errorType = classifyError(errorMsg);
  const reflection = await generateReflection(goal, errorMsg, action, errorType);

  await db.insert(learnedLessons).values({
    context: goal.substring(0, 200),
    errorType,
    errorMessage: errorMsg.substring(0, 500),
    reflection: reflection.analysis,
    lesson: reflection.lesson,
    correction: reflection.correction,
  });

  await adjustPlanScore(goal, -1);
  return reflection;
}

function classifyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('timeout')) return 'timeout';
  if (m.includes('not found') || m.includes('enoent')) return 'not_found';
  if (m.includes('permission') || m.includes('eacces')) return 'permission';
  if (m.includes('json') || m.includes('parse')) return 'parse_error';
  return 'unknown';
}

async function generateReflection(goal: string, errorMsg: string, action: string, errorType: string) {
  const prompt = `Analise a falha e gere uma lição.
TAREFA: "${goal}"
ERRO: "${errorMsg}"
AÇÃO: "${action}"
TIPO: ${errorType}
Responda JSON: {"analysis":"...","lesson":"...","correction":"..."}`;

  try {
    const result = await llmClient.generate([{ role: 'user', content: prompt }], {
      model: 'phi3:3.8b',
      temperature: 0.3,
      maxTokens: 300,
      jsonOutput: true,
    });
    return JSON.parse(result.text);
  } catch {
    return {
      analysis: `Falha: ${errorMsg}`,
      lesson: `Evitar "${action}" em caso de ${errorType}`,
      correction: 'Verificar pré-condições',
    };
  }
}

export async function adjustPlanScore(goalPattern: string, delta: number) {
  const existing = await db.select().from(planScores).where(eq(planScores.goalPattern, goalPattern.substring(0, 100))).get();

  if (existing) {
    const newSuccess = delta > 0 ? existing.successCount + 1 : existing.successCount;
    const newFailure = delta < 0 ? existing.failureCount + 1 : existing.failureCount;
    const total = newSuccess + newFailure;
    const score = total > 0 ? (newSuccess / total) * 100 : 0;

    await db.update(planScores).set({
      successCount: newSuccess,
      failureCount: newFailure,
      totalScore: score,
      lastUsed: new Date(),
    }).where(eq(planScores.goalPattern, goalPattern.substring(0, 100)));
  } else {
    await db.insert(planScores).values({
      goalPattern: goalPattern.substring(0, 100),
      successCount: delta > 0 ? 1 : 0,
      failureCount: delta < 0 ? 1 : 0,
      totalScore: delta > 0 ? 100 : 0,
      lastUsed: new Date(),
    });
  }
}

export function detectFeedbackSignal(message: string): { type: 'positive' | 'negative'; strength: number } | null {
  const lower = message.toLowerCase();
  const positive = ['isso mesmo', 'perfeito', 'ótimo', 'excelente', 'boa', 'muito bom', 'obrigado', 'valeu', 'certo', 'correto', 'é isso', 'funcionou'];
  const negative = ['não é isso', 'errado', 'não foi isso', 'faça de outro jeito', 'de outra forma', 'não assim', 'tente novamente', 'não funcionou'];

  if (positive.some(p => lower.includes(p))) return { type: 'positive', strength: 1 };
  if (negative.some(n => lower.includes(n))) return { type: 'negative', strength: -1 };
  return null;
}

export async function saveMemory(type: string, content: string, userId: string) {
  await db.insert(agentMemory).values({
    userId,
    type,
    content,
    metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
  });
}

export async function getRelevantLessons(context: string, limit = 3) {
  const words = context.toLowerCase().split(' ').filter(w => w.length > 3).slice(0, 3);
  if (!words.length) return [];

  const conditions = words.map(w => or(like(learnedLessons.context, `%${w}%`), like(learnedLessons.errorMessage, `%${w}%`)));
  return await db.select().from(learnedLessons).where(or(...conditions)).orderBy(desc(learnedLessons.timesEncountered)).limit(limit);
}