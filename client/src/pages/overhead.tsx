import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertOverheadEntrySchema, type OverheadEntry, type Receipt } from "@shared/schema";
import { Briefcase, Plus, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ReceiptUploader } from "@/components/ReceiptUploader";
import { parseNumericInput, isPositiveNumber } from "@/lib/numberUtils";

interface OverheadProps {
  projectId: string | null;
}

const formSchema = insertOverheadEntrySchema.extend({
  cost: z.string().min(1, "Cost required").refine(isPositiveNumber, {
    message: "Cost must be a positive number",
  }),
  date: z.string().min(1, "Date required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Overhead({ projectId }: OverheadProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery<OverheadEntry[]>({
    queryKey: ["/api/projects", projectId, "overhead"],
    enabled: !!projectId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId || "",
      description: "",
      cost: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (projectId) {
      form.setValue("projectId", projectId);
    }
  }, [projectId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/overhead", {
        ...data,
        cost: parseNumericInput(data.cost),
      });
      const entry = await response.json();
      
      // Link receipt to overhead entry if one was uploaded
      if (uploadedReceiptId && entry.id) {
        try {
          await apiRequest("POST", `/api/receipts/${uploadedReceiptId}/link`, {
            entryType: "overhead",
            entryId: entry.id,
          });
        } catch (error) {
          console.error("Failed to link receipt:", error);
        }
      }
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "overhead"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Entry created",
        description: "Overhead entry has been added successfully",
      });
      form.reset({
        projectId: projectId || "",
        description: "",
        cost: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      setUploadedReceiptId(null);
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create overhead entry",
        variant: "destructive",
      });
    },
  });

  const handleApplyReceipt = (receipt: Receipt, analysisData: any) => {
    setUploadedReceiptId(receipt.id);
    
    // Populate date if available
    if (analysisData.date) {
      form.setValue("date", analysisData.date);
    }
    
    // Populate cost from total
    if (analysisData.total) {
      form.setValue("cost", String(analysisData.total));
    }
    
    // Populate description from vendor and/or line items
    if (analysisData.vendor) {
      form.setValue("description", analysisData.vendor);
    } else if (analysisData.lineItems && analysisData.lineItems.length > 0) {
      const descriptions = analysisData.lineItems.map((item: any) => item.description).join(", ");
      form.setValue("description", descriptions);
    }
    
    toast({
      title: "Receipt Applied",
      description: "Form fields populated from receipt data.",
    });
  };

  const handleSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6" data-testid="overhead-empty-state">
        <Briefcase className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project from the sidebar to track overhead costs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            Overhead
          </h1>
          <p className="text-muted-foreground mt-1">Track administrative and indirect costs</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-toggle-form">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Add Entry"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Overhead Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {projectId && (
                  <ReceiptUploader
                    projectId={projectId}
                    onApply={handleApplyReceipt}
                  />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Office supplies, permits, insurance..." {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="150.00" 
                            {...field} 
                            data-testid="input-cost"
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
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Creating..." : "Create Entry"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover-elevate" data-testid={`entry-${entry.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg" data-testid={`description-${entry.id}`}>
                          {entry.description}
                        </h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary" data-testid={`cost-${entry.id}`}>
                        ${parseFloat(entry.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Overhead Entries</h3>
              <p className="text-muted-foreground mb-4">
                Track administrative costs, permits, insurance, and other indirect expenses.
              </p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first-entry">
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
