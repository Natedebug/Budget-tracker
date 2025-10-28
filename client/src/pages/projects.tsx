import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProjectSchema, type Project } from "@shared/schema";
import { FolderKanban, Plus, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const formSchema = insertProjectSchema.extend({
  totalBudget: z.string().min(1, "Total budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Total budget must be a positive number",
  }),
  laborBudget: z.string().min(1, "Labor budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  materialsBudget: z.string().min(1, "Materials budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  equipmentBudget: z.string().min(1, "Equipment budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  subcontractorsBudget: z.string().min(1, "Subcontractors budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  overheadBudget: z.string().min(1, "Overhead budget required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Must be a non-negative number",
  }),
  startDate: z.string().min(1, "Start date required"),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectsProps {
  onProjectSelect: (projectId: string) => void;
}

export default function Projects({ onProjectSelect }: ProjectsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      totalBudget: "",
      laborBudget: "",
      materialsBudget: "",
      equipmentBudget: "",
      subcontractorsBudget: "",
      overheadBudget: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/projects", {
        ...data,
        totalBudget: parseFloat(data.totalBudget),
        laborBudget: parseFloat(data.laborBudget),
        materialsBudget: parseFloat(data.materialsBudget),
        equipmentBudget: parseFloat(data.equipmentBudget),
        subcontractorsBudget: parseFloat(data.subcontractorsBudget),
        overheadBudget: parseFloat(data.overheadBudget),
        endDate: data.endDate || null,
      }),
    onSuccess: (newProject: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "New project has been created successfully.",
      });
      form.reset({
        name: "",
        totalBudget: "",
        laborBudget: "",
        materialsBudget: "",
        equipmentBudget: "",
        subcontractorsBudget: "",
        overheadBudget: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: "",
      });
      setShowForm(false);
      if (newProject && newProject.id) {
        onProjectSelect(newProject.id);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage construction projects and budgets</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-project"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {showForm && (
        <Card data-testid="card-project-form">
          <CardHeader>
            <CardTitle className="text-lg">New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Downtown Office Building" 
                          {...field} 
                          data-testid="input-project-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="500000" 
                          {...field} 
                          data-testid="input-total-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Category Budgets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="laborBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="200000" 
                              {...field} 
                              data-testid="input-labor-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="materialsBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Materials ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="150000" 
                              {...field} 
                              data-testid="input-materials-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="equipmentBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="100000" 
                              {...field} 
                              data-testid="input-equipment-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcontractorsBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontractors ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="30000" 
                              {...field} 
                              data-testid="input-subcontractors-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="overheadBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overhead ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="20000" 
                              {...field} 
                              data-testid="input-overhead-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-project"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : projects && projects.length > 0 ? (
          projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover-elevate cursor-pointer" 
              onClick={() => onProjectSelect(project.id)}
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg" data-testid="text-project-name">{project.name}</CardTitle>
                  <FolderKanban className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-mono font-bold text-foreground" data-testid="text-project-budget">
                    ${parseFloat(project.totalBudget).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Started {format(new Date(project.startDate), "MMM d, yyyy")}</span>
                </div>
                {project.endDate && (
                  <Badge variant="secondary">
                    Ends {format(new Date(project.endDate), "MMM d, yyyy")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first construction project to start tracking budgets.
              </p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first-project">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
