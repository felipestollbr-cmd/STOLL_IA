import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Search, MessageSquare } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function HistoryPage() {
  const listConversations = trpc.chat.listConversations.useQuery();
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);

  useEffect(() => {
    if (listConversations.data) {
      setConversations(listConversations.data);
    }
  }, [listConversations.data]);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.description && conv.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-accent">Histórico de Conversas</h1>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Conversations List */}
      {listConversations.isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredConversations.map((conv) => (
            <Card
              key={conv.id}
              className={`p-4 cursor-pointer transition hover:bg-muted/50 ${
                selectedConversation === conv.id ? "bg-accent/10 border-accent" : ""
              }`}
              onClick={() => setSelectedConversation(conv.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{conv.title}</h3>
                  {conv.description && (
                    <p className="text-sm text-muted-foreground mt-1">{conv.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {new Date(conv.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
              {selectedConversation === conv.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button className="w-full bg-accent text-accent-foreground hover:opacity-90">
                    Abrir Conversa
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
