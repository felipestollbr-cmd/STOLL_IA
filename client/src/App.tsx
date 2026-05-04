import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChatPage from "./pages/ChatPage";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "./const";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-foreground">Carregando STOLL...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold text-accent">STOLL</h1>
          <p className="text-foreground max-w-md">
            Seu agente de IA autônomo com poder total de automação
          </p>
          <a
            href={getLoginUrl()}
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition"
          >
            Entrar com Manus
          </a>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path={"/"} component={ChatPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
