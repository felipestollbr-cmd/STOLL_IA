// Adicione ao arquivo existente
export interface Task {
  id: string;
  type: 'shell' | 'browser' | 'filesystem' | 'ai' | 'desktop_click' | 'desktop_type' | 'desktop_screenshot';
  status: 'pending' | 'running' | 'completed' | 'failed';
  params: Record<string, any>;
  result?: string;
  output?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMemory {
  id: string;
  type: 'preference' | 'lesson' | 'context' | 'skill';
  content: string;
  metadata: Record<string, any>;
}

export interface UserPreferences {
  preferredModel: 'gemini' | 'ollama';
  agentPersona: 'assistant' | 'senior_engineer' | 'casual';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}