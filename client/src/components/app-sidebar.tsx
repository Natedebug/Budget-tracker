import { LayoutDashboard, Clock, TrendingUp, Truck, Users, Briefcase, FolderKanban, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { type Project } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface AppSidebarProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string) => void;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Timesheets",
    url: "/timesheets",
    icon: Clock,
  },
  {
    title: "Progress",
    url: "/progress",
    icon: TrendingUp,
  },
  {
    title: "Equipment",
    url: "/equipment",
    icon: Truck,
  },
  {
    title: "Subcontractors",
    url: "/subcontractors",
    icon: Users,
  },
  {
    title: "Overhead",
    url: "/overhead",
    icon: Briefcase,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
  },
];

export function AppSidebar({ selectedProjectId, onProjectChange }: AppSidebarProps) {
  const [location] = useLocation();
  
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleExport = async () => {
    if (!selectedProjectId) return;
    
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-report-${selectedProjectId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <Sidebar data-testid="sidebar">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">BS</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">BudgetSync</h2>
            <p className="text-xs text-muted-foreground">Field Tracking</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Project Selector */}
        <SidebarGroup>
          <SidebarGroupLabel>Active Project</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <Select value={selectedProjectId || ""} onValueChange={onProjectChange}>
              <SelectTrigger data-testid="select-project">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
                {(!projects || projects.length === 0) && (
                  <SelectItem value="none" disabled>
                    No projects available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleExport}
          disabled={!selectedProjectId}
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
