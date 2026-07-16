import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import { ModeSelection } from "./components/ModeSelection";
import { TeamOnboarding } from "./components/TeamOnboarding";
import { SetupConfig } from "./components/SetupConfig";
import { useLocalStorage } from "./hooks/use-local-storage";

const queryClient = new QueryClient();

type AppMode = "solo" | "team" | null;

function AppShell() {
  const [mode, setMode] = useLocalStorage<AppMode>("bb-mode", null);
  const [userId, setUserId] = useLocalStorage<number | null>("bb-userId-num", null);
  const [teamId, setTeamId] = useLocalStorage<number | null>("bb-teamId-num", null);
  // configPending: true means show SetupConfig before starting the timer
  const [configPending, setConfigPending] = useState(false);

  // Read legacy userId if set as string
  const storedUserId = userId ?? (() => {
    const raw = window.localStorage.getItem("bb-userId");
    return raw ? Number(raw) : null;
  })();

  const handleModeSelect = (selected: "solo" | "team") => {
    if (selected === "solo") {
      setMode("solo");
      setConfigPending(true);
    } else {
      setMode("team");
    }
  };

  const handleTeamComplete = (uid: number, tid: number) => {
    setUserId(uid);
    setTeamId(tid);
    setMode("team");
    setConfigPending(true);
  };

  const handleBack = () => {
    setMode(null);
  };

  if (!mode) {
    return (
      <AnimatePresence mode="wait">
        <ModeSelection key="mode-select" onSelect={handleModeSelect} />
      </AnimatePresence>
    );
  }

  if (mode === "team" && !teamId) {
    return (
      <TeamOnboarding
        initialUserId={storedUserId}
        onComplete={handleTeamComplete}
        onBack={handleBack}
      />
    );
  }

  if (configPending) {
    return (
      <AnimatePresence mode="wait">
        <SetupConfig key="setup-config" onStart={() => setConfigPending(false)} />
      </AnimatePresence>
    );
  }

  return (
    <Home
      mode={mode}
      userId={storedUserId}
      teamId={teamId}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppShell />
      </Route>
      <Route>
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center font-bold">
            <h1 className="text-4xl mb-2">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
