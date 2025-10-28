import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Timesheets from "@/pages/timesheets";
import ProgressReports from "@/pages/progress-reports";
import Equipment from "@/pages/equipment";
import Subcontractors from "@/pages/subcontractors";
import Overhead from "@/pages/overhead";
import Projects from "@/pages/projects";
import Employees from "@/pages/employees";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

function Router({ projectId, onProjectSelect }: { projectId: string | null; onProjectSelect: (id: string) => void }) {
  return (
    <Switch>
      <Route path="/" component={() => <Dashboard projectId={projectId} />} />
      <Route path="/timesheets" component={() => <Timesheets projectId={projectId} />} />
      <Route path="/progress" component={() => <ProgressReports projectId={projectId} />} />
      <Route path="/equipment" component={() => <Equipment projectId={projectId} />} />
      <Route path="/subcontractors" component={() => <Subcontractors projectId={projectId} />} />
      <Route path="/overhead" component={() => <Overhead projectId={projectId} />} />
      <Route path="/projects" component={() => <Projects onProjectSelect={onProjectSelect} />} />
      <Route path="/employees" component={Employees} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
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

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show landing page for unauthenticated users or during loading
  if (isLoading || !isAuthenticated) {
    return <Landing />;
  }

  // Show authenticated app
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          selectedProjectId={selectedProjectId} 
          onProjectChange={handleProjectChange}
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium" data-testid="text-user-name">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.email || 'User'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Logout"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <Router projectId={selectedProjectId} onProjectSelect={handleProjectChange} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
