import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Menu, X, Plus, History, Brain, Settings, LogOut } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"idle" | "thinking" | "executing">("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC queries and mutations
  const listConversations = trpc.chat.listConversations.useQuery();
  const getMessages = trpc.chat.getMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: !!currentConversationId }
  );
  const createConversationMutation = trpc.chat.createConversation.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations
  useEffect(() => {
    if (listConversations.data) {
      setConversations(listConversations.data);
    }
  }, [listConversations.data]);

  // Load messages for current conversation
  useEffect(() => {
    if (getMessages.data) {
      setMessages(getMessages.data);
    }
  }, [getMessages.data]);

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const result = await createConversationMutation.mutateAsync({
        title: `Conversa ${new Date().toLocaleDateString("pt-BR")}`,
        description: "Nova conversa com STOLL",
      });
      setCurrentConversationId(result.conversationId);
      setMessages([]);
      await listConversations.refetch();
    } catch (error) {
      toast.error("Erro ao criar conversa");
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentConversationId) return;

    const userMessage = inputValue;
    setInputValue("");
    setAgentStatus("thinking");

    try {
      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage, createdAt: new Date() },
      ]);

      // Send to LLM
      const result = await sendMessageMutation.mutateAsync({
        conversationId: currentConversationId,
        content: userMessage,
      });

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.message, createdAt: new Date() },
      ]);

      setAgentStatus("idle");
      await getMessages.refetch();
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      setAgentStatus("idle");
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-card border-r border-border flex flex-col`}
      >
        {sidebarOpen && (
          <div className="p-4 space-y-4 flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-lg text-accent">STOLL</span>
            </div>

            {/* New Conversation Button */}
            <Button
              onClick={handleNewConversation}
              className="w-full bg-accent text-accent-foreground hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-semibold px-2">
                Conversas
              </p>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    getMessages.refetch();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    currentConversationId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {conv.title}
                </button>
              ))}
            </div>

            {/* Navigation Items */}
            <div className="space-y-2 border-t border-border pt-4">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-foreground">
                <History className="w-4 h-4" />
                <span className="text-sm">Histórico</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-foreground">
                <Brain className="w-4 h-4" />
                <span className="text-sm">Memória</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-foreground">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configurações</span>
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 transition text-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-accent">STOLL</h1>
              <p className="text-xs text-muted-foreground">
                Status:{" "}
                <span
                  className={
                    agentStatus === "idle"
                      ? "text-green-400"
                      : agentStatus === "thinking"
                      ? "text-yellow-400"
                      : "text-blue-400"
                  }
                >
                  {agentStatus === "idle"
                    ? "Ocioso"
                    : agentStatus === "thinking"
                    ? "Pensando..."
                    : "Executando..."}
                </span>
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Olá, {user?.name || "Usuário"}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!currentConversationId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-accent mb-2">Bem-vindo ao STOLL</h2>
                <p className="text-muted-foreground mb-6">
                  Comece uma nova conversa para interagir com seu agente de IA
                </p>
                <Button
                  onClick={handleNewConversation}
                  className="bg-accent text-accent-foreground hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Iniciar Conversa
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Nenhuma mensagem ainda. Comece digitando!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`max-w-md p-4 ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <Streamdown>{msg.content}</Streamdown>
                    </Card>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {currentConversationId && (
          <div className="bg-card border-t border-border p-6">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-accent text-accent-foreground hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
