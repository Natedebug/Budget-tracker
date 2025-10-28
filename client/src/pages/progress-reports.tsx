import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProgressReportSchema, type ProgressReport } from "@shared/schema";
import { TrendingUp, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface ProgressReportsProps {
  projectId: string | null;
}

const formSchema = insertProgressReportSchema.extend({
  percentComplete: z.string().min(1, "Progress percentage required").refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: "Must be between 0 and 100" }
  ),
  date: z.string().min(1, "Date required"),
});

type FormData = z.infer<typeof formSchema>;

export default function ProgressReports({ projectId }: ProgressReportsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data: reports, isLoading } = useQuery<ProgressReport[]>({
    queryKey: ["/api/projects", projectId, "progress-reports"],
    enabled: !!projectId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId || "",
      percentComplete: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  // Update projectId when it changes
  useEffect(() => {
    if (projectId) {
      form.setValue("projectId", projectId);
    }
  }, [projectId, form]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/progress-reports", {
        ...data,
        percentComplete: parseInt(data.percentComplete),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "progress-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Progress Report Added",
        description: "Progress report has been saved successfully.",
      });
      form.reset({
        projectId: projectId || "",
        percentComplete: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save progress report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project to track progress and milestones.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Progress Reports</h1>
          <p className="text-muted-foreground mt-1">Track project completion and milestones</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-progress-report"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {showForm && (
        <Card data-testid="card-progress-form">
          <CardHeader>
            <CardTitle className="text-lg">New Progress Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="percentComplete"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percent Complete (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="75" 
                            {...field} 
                            data-testid="input-percent-complete"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Milestones reached, work completed, materials used..."
                          className="min-h-24"
                          {...field} 
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
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
                    data-testid="button-submit-progress"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Report"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id} data-testid={`card-progress-${report.id}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(report.date), "MMMM d, yyyy")}
                      </p>
                      <span className="text-2xl font-mono font-bold text-primary" data-testid="text-percent">
                        {report.percentComplete}%
                      </span>
                    </div>
                    <Progress value={report.percentComplete} className="h-3 mb-3" />
                    {report.notes && (
                      <p className="text-sm text-foreground mt-3">{report.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Progress Reports Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking project progress by adding reports.
              </p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first-report">
                <Plus className="w-4 h-4 mr-2" />
                Add First Report
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
