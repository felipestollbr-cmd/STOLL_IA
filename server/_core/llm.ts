import { generateText, type CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider';

interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  jsonOutput?: boolean;
}

export class LLMClient {
  private provider: 'gemini' | 'ollama';
  private ollamaModel: string;
  private geminiModel: string;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as 'gemini' | 'ollama') || 'ollama';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma2:2b';
    this.geminiModel = 'gemini-2.5-flash';
  }

  async generate(messages: CoreMessage[], options: LLMOptions = {}) {
    const { model, temperature = 0.7, maxTokens = 2000, systemPrompt, jsonOutput } = options;
    const selectedModel = model || (this.provider === 'ollama' ? this.ollamaModel : this.geminiModel);

    if (this.provider === 'ollama') {
      const ollama = createOllama({ baseURL: 'http://localhost:11434/api' });
      return await generateText({
        model: ollama(selectedModel),
        messages,
        temperature,
        maxTokens,
        system: systemPrompt,
        ...(jsonOutput ? { response_format: { type: 'json_object' } } : {}),
      });
    } else {
      const google = createGoogleGenerativeAI({ apiKey: process.env.BUILT_IN_FORGE_API_KEY || '' });
      return await generateText({
        model: google(selectedModel),
        messages,
        temperature,
        maxTokens,
        system: systemPrompt,
        ...(jsonOutput ? { response_format: { type: 'json_object' } } : {}),
      });
    }
  }

  async classifyIntent(text: string): Promise<string> {
    const result = await this.generate([{ role: 'user', content: text }], {
      model: 'phi3:3.8b',
      temperature: 0,
      maxTokens: 20,
      systemPrompt: `Classifique em UMA palavra: "action" (executar algo), "knowledge" (pergunta), "learn" (ensinar), "chitchat" (conversa).`,
    });
    return result.text.trim().toLowerCase();
  }

  async generateActionPlan(goal: string, context?: string): Promise<any> {
    const systemPrompt = `Você é um agente que controla um computador. ${context || ''}
Ações: system_info, list_files(path), organize_files(path), create_file(name,content,path), run_shell(command), browse_web(url), desktop_click(x,y), desktop_type(text), desktop_screenshot, web_search(query), finish.
Responda APENAS JSON: {"thought":"...","plan":["passo1"],"action":"...","params":{}}`;

    const result = await this.generate([{ role: 'user', content: goal }], {
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt,
      jsonOutput: true,
    });
    
    try {
      return JSON.parse(result.text);
    } catch {
      return null;
    }
  }

  async answerQuestion(question: string, personaPrompt?: string): Promise<string> {
    const result = await this.generate([{ role: 'user', content: question }], {
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: personaPrompt,
    });
    return result.text;
  }

  setProvider(provider: 'gemini' | 'ollama') {
    this.provider = provider;
  }
}

export const llmClient = new LLMClient();