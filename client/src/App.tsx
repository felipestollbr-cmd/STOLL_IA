import { useState, useRef, useEffect } from 'react';
import { useAuth } from './_core/hooks/useAuth';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: string;
  collapsed?: boolean;
}

export default function App() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Olá! Eu sou o STOLL. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState('ollama');
  const [activePanel, setActivePanel] = useState('chat');
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto‑scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || sending) return;
    const updatedMessages = [...messages, { role: 'user' as const, content: message }];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('http://localhost:3000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_command',
          goal: message,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      const additions: Message[] = [];
      if (data.thought) additions.push({ role: 'assistant', content: data.thought, type: 'thought' });
      if (data.plan?.length) additions.push({ role: 'assistant', content: data.plan.join(' | '), type: 'plan' });
      if (data.result) additions.push({ role: 'assistant', content: data.result, type: 'result' });
      if (data.output) additions.push({ role: 'assistant', content: data.output, type: 'output' });
      if (data.error) additions.push({ role: 'system', content: '⚠️ ' + data.error, type: 'error' });
      if (additions.length === 0) additions.push({ role: 'assistant', content: 'Comando processado.' });
      setMessages([...updatedMessages, ...additions]);
    } catch (e) {
      setMessages([...updatedMessages, { role: 'system', content: '🔴 Erro de conexão com o servidor.' }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Inicializando STOLL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-6">
        <div className="text-2xl font-bold text-purple-400">STOLL</div>
        <nav className="flex flex-col gap-2">
          {(['chat', 'tasks', 'memory', 'settings'] as const).map(panel => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`text-left px-3 py-2 rounded ${activePanel === panel ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              {panel === 'chat' && '💬 Chat'}
              {panel === 'tasks' && '📋 Tarefas'}
              {panel === 'memory' && '🧠 Memória'}
              {panel === 'settings' && '⚙️ Config'}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
          >
            <option value="ollama">Ollama (local)</option>
            <option value="gemini">Gemini (Manus)</option>
          </select>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col">
        {activePanel === 'chat' && (
          <>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-purple-600' : msg.role === 'system' ? 'bg-yellow-900/50 text-yellow-200' : 'bg-gray-800'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-xl p-3 text-gray-400">Pensando...</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Digite seu comando..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-gray-100 placeholder-gray-500"
                  disabled={sending}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={sending || !input.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-5 py-3 rounded-xl font-bold"
                >
                  ▶
                </button>
              </div>
            </div>
          </>
        )}

        {activePanel === 'tasks' && (
          <div className="flex-1 p-6 text-gray-400">Painel de Tarefas (em breve)</div>
        )}
        {activePanel === 'memory' && (
          <div className="flex-1 p-6 text-gray-400">Painel de Memória (em breve)</div>
        )}
        {activePanel === 'settings' && (
          <div className="flex-1 p-6 text-gray-400">Configurações (em breve)</div>
        )}
      </main>
    </div>
  );
}