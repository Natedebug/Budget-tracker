import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Timesheets from "@/pages/timesheets";
import ProgressReports from "@/pages/progress-reports";
import Equipment from "@/pages/equipment";
import Projects from "@/pages/projects";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";

function Router({ projectId, onProjectSelect }: { projectId: string | null; onProjectSelect: (id: string) => void }) {
  return (
    <Switch>
      <Route path="/" component={() => <Dashboard projectId={projectId} />} />
      <Route path="/timesheets" component={() => <Timesheets projectId={projectId} />} />
      <Route path="/progress" component={() => <ProgressReports projectId={projectId} />} />
      <Route path="/equipment" component={() => <Equipment projectId={projectId} />} />
      <Route path="/projects" component={() => <Projects onProjectSelect={onProjectSelect} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("selectedProjectId");
    if (stored) {
      setSelectedProjectId(stored);
    }
  }, []);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem("selectedProjectId", projectId);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar 
              selectedProjectId={selectedProjectId} 
              onProjectChange={handleProjectChange}
            />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto bg-background">
                <Router projectId={selectedProjectId} onProjectSelect={handleProjectChange} />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
