import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const getPreferences = trpc.preferences.getPreferences.useQuery();
  const updatePreferencesMutation = trpc.preferences.updatePreferences.useMutation();

  const [preferredModel, setPreferredModel] = useState("gemini");
  const [agentPersona, setAgentPersona] = useState("assistant");
  const [temperature, setTemperature] = useState(70);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (getPreferences.data) {
      setPreferredModel(getPreferences.data.preferredModel || "gemini");
      setAgentPersona(getPreferences.data.agentPersona || "assistant");
      setTemperature(getPreferences.data.temperature || 70);
      setMaxTokens(getPreferences.data.maxTokens || 2000);
      setSystemPrompt(getPreferences.data.systemPrompt || "");
    }
  }, [getPreferences.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferencesMutation.mutateAsync({
        preferredModel,
        agentPersona,
        temperature,
        maxTokens,
        systemPrompt,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-accent">Configurações</h1>

      <Card className="p-6 space-y-6">
        {/* Modelo de IA */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Modelo de IA Preferido</label>
          <Select value={preferredModel} onValueChange={setPreferredModel}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="ollama">Ollama (Local)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Escolha qual modelo de IA será usado para processar suas mensagens
          </p>
        </div>

        {/* Persona do Agente */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Persona do Agente</label>
          <Input
            value={agentPersona}
            onChange={(e) => setAgentPersona(e.target.value)}
            placeholder="Ex: assistente técnico, consultor, professor..."
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Define a personalidade e estilo de resposta do STOLL
          </p>
        </div>

        {/* Temperatura */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Temperatura: {temperature}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controla a criatividade das respostas (0 = determinístico, 100 = criativo)
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Comprimento Máximo da Resposta</label>
          <Input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            min="100"
            max="4000"
            className="bg-input border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Número máximo de tokens (palavras) nas respostas
          </p>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Instrução do Sistema</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Digite instruções personalizadas para o agente..."
            className="w-full h-32 p-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Instruções customizadas que o STOLL seguirá em todas as conversas
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-accent text-accent-foreground hover:opacity-90"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
