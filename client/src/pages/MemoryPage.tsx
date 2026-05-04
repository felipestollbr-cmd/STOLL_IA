import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Lightbulb, Target, Zap } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function MemoryPage() {
  const getMemory = trpc.memory.getMemory.useQuery({});
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<"preference" | "lesson" | "context" | "skill">(
    "preference"
  );

  useEffect(() => {
    if (getMemory.data) {
      setMemories(getMemory.data);
    }
  }, [getMemory.data]);

  const filteredMemories = memories.filter((m) => m.memoryType === selectedType);

  const getIcon = (type: string) => {
    switch (type) {
      case "preference":
        return <Target className="w-4 h-4" />;
      case "lesson":
        return <Lightbulb className="w-4 h-4" />;
      case "context":
        return <Brain className="w-4 h-4" />;
      case "skill":
        return <Zap className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "preference":
        return "Preferências";
      case "lesson":
        return "Lições Aprendidas";
      case "context":
        return "Contexto";
      case "skill":
        return "Habilidades";
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-accent">Memória do Agente</h1>
      <p className="text-muted-foreground">
        Visualize o que o STOLL aprendeu sobre você e suas preferências
      </p>

      <Tabs
        defaultValue="preference"
        onValueChange={(v) => setSelectedType(v as any)}
        className="space-y-4"
      >
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="preference">Preferências</TabsTrigger>
          <TabsTrigger value="lesson">Lições</TabsTrigger>
          <TabsTrigger value="context">Contexto</TabsTrigger>
          <TabsTrigger value="skill">Habilidades</TabsTrigger>
        </TabsList>

        {["preference", "lesson", "context", "skill"].map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {getMemory.isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : filteredMemories.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhuma {getTypeLabel(type).toLowerCase()} registrada ainda
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredMemories.map((memory) => (
                  <Card key={memory.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-accent">{getIcon(memory.memoryType)}</div>
                        <div>
                          <h3 className="font-semibold text-foreground">{memory.key}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(memory.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                        {memory.confidence}% confiança
                      </div>
                    </div>
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded">
                      {typeof memory.value === "string"
                        ? memory.value
                        : JSON.stringify(memory.value)}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
