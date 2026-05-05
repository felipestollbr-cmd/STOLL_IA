import { Router } from 'express';
import { llmClient } from '../_core/llm';
import { db } from '../db';         // ← ajuste se estiver usando getDb()
import { desktopClick, desktopType, desktopScreenshot } from '../tasks/desktop';
import { browseWeb } from '../tasks/browser';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import duckduckgoSearch from 'duckduckgo-search';

const router = Router();

async function webSearch(query: string) {
  const results = [];
  for await (const result of duckduckgoSearch.text(query)) {
    results.push(`${result.title}\n${result.body}\n${result.href}`);
  }
  return results.join('\n\n');
}

async function executeAction(act: string, params: any = {}) {
  let output = '', result = '';

  try {
    switch (act) {
      case 'system_info':
        output = `🖥️ ${os.type()} ${os.release()}`;
        result = '✅ Informações do sistema';
        break;
      case 'list_files':
        output = '📁 Listagem (implemente no futuro)';
        result = '✅ Lista gerada';
        break;
      case 'run_shell':
        output = execSync(params.command, { encoding: 'utf8', timeout: 30000 });
        result = '✅ Comando executado';
        break;
      case 'browse_web':
        output = (await browseWeb(params.url, params.action, params.selector, params.value)).output;
        result = '✅ Navegação concluída';
        break;
      case 'desktop_click':
        output = await desktopClick({ x: params.x, y: params.y });
        result = '✅ Clique executado';
        break;
      case 'desktop_type':
        output = await desktopType({ text: params.text });
        result = '✅ Texto digitado';
        break;
      case 'desktop_screenshot':
        output = (await desktopScreenshot()).output;
        result = '✅ Screenshot salvo';
        break;
      case 'web_search':
        output = await webSearch(params.query);
        result = '✅ Busca realizada';
        break;
      default:
        output = `Ação ${act} executada`;
        result = '✅';
    }
  } catch (e: any) {
    output = e.message;
    result = '❌ Erro';
  }

  return { output, result };
}

async function agentLoop(goal: string, maxSteps = 5) {
  let context = goal;
  let steps = 0;
  let finalOutput = '';

  while (steps < maxSteps) {
    // 1. Planeja o próximo passo
    const plan = await llmClient.generateActionPlan(context);

    if (!plan || plan.action === 'finish') {
      return { result: plan?.thought || 'Tarefa concluída', output: finalOutput || context };
    }

    // 2. Executa a ação
    const execution = await executeAction(plan.action, plan.params);

    finalOutput += `\nPasso ${steps + 1}: ${plan.thought}\nResultado: ${execution.output}`;
    // 3. Atualiza o contexto com o resultado
    context += `\nResultado: ${execution.output}`;
    steps++;
  }

  return { result: 'Limite de passos atingido', output: finalOutput };
}

router.post('/', async (req, res) => {
  const { action, goal, model } = req.body;

  if (action === 'ping') {
    return res.json({ status: 'online' });
  }

  if (action !== 'execute_command' || !goal) {
    return res.json({ error: 'Ação inválida' });
  }

  try {
    // Processamento local (saudações, ações do sistema)
    const lowerGoal = goal.toLowerCase();

    // Saudação
    const saudacoes = ['bom dia', 'boa tarde', 'boa noite', 'olá', 'ola', 'oi'];
    if (saudacoes.some(s => lowerGoal.startsWith(s))) {
      const hora = new Date().getHours();
      const periodo = hora < 12 ? 'dia' : hora < 18 ? 'tarde' : 'noite';
      return res.json({ result: `👋 Olá! Boa ${periodo}!`, output: 'Como posso ajudar?' });
    }

    // Status do sistema
    if (lowerGoal.includes('status') && lowerGoal.includes('sistema')) {
      return res.json({
        thought: 'Coletando informações...',
        plan: ['Sistema'],
        result: '✅ Status do sistema',
        output: `🖥️ SO: ${os.type()} ${os.release()}\n💻 Host: ${os.hostname()}\n👤 Usuário: ${os.userInfo().username}\n💾 RAM: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
      });
    }

    // Classificar intenção
    let intent: string;
    try {
      intent = await llmClient.classifyIntent(goal);
    } catch {
      intent = 'knowledge';
    }

    if (intent === 'action') {
      const { result, output } = await agentLoop(goal);
      return res.json({ thought: 'Raciocínio multi-etapas', plan: ['Vários passos'], result, output });
    }

    // Conhecimento geral com grounding
    const searchResults = await webSearch(goal);
    const prompt = `Responda à pergunta com base nestas informações:\n${searchResults}\n\nPergunta: ${goal}`;
    const answer = await llmClient.answerQuestion(prompt);
    return res.json({ result: answer, output: answer });
  } catch (e: any) {
    return res.json({ error: e.message });
  }
});

export default router;