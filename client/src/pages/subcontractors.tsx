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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertSubcontractorEntrySchema, type SubcontractorEntry, type Receipt, type Category } from "@shared/schema";
import { Users, Plus, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ReceiptUploader } from "@/components/ReceiptUploader";
import { parseNumericInput, isPositiveNumber } from "@/lib/numberUtils";

interface SubcontractorsProps {
  projectId: string | null;
}

const formSchema = insertSubcontractorEntrySchema.extend({
  cost: z.string().min(1, "Cost required").refine(isPositiveNumber, {
    message: "Cost must be a positive number",
  }),
  date: z.string().min(1, "Date required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Subcontractors({ projectId }: SubcontractorsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null);

  const { data: entries, isLoading } = useQuery<SubcontractorEntry[]>({
    queryKey: ["/api/projects", projectId, "subcontractors"],
    enabled: !!projectId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/projects", projectId, "categories"],
    enabled: !!projectId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId || "",
      contractorName: "",
      cost: "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      categoryId: undefined,
    },
  });

  useEffect(() => {
    if (projectId) {
      form.setValue("projectId", projectId);
    }
  }, [projectId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/subcontractors", {
        ...data,
        cost: parseNumericInput(data.cost),
        categoryId: data.categoryId === "none" ? undefined : data.categoryId,
      });
      const entry = await response.json();
      
      // Link receipt to subcontractor entry if one was uploaded
      if (uploadedReceiptId && entry.id) {
        try {
          await apiRequest("POST", `/api/receipts/${uploadedReceiptId}/link`, {
            entryType: "subcontractor",
            entryId: entry.id,
          });
        } catch (error) {
          console.error("Failed to link receipt:", error);
        }
      }
      
      return entry;
    },
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects", projectId, "subcontractors"] });
      
      const previousEntries = queryClient.getQueryData<SubcontractorEntry[]>(["/api/projects", projectId, "subcontractors"]);
      
      const optimisticEntry = {
        id: `temp-${Date.now()}`,
        projectId: newEntry.projectId,
        contractorName: newEntry.contractorName,
        cost: newEntry.cost,
        date: newEntry.date,
        description: newEntry.description || null,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData<SubcontractorEntry[]>(
        ["/api/projects", projectId, "subcontractors"],
        (old) => [optimisticEntry as SubcontractorEntry, ...(old || [])]
      );
      
      return { previousEntries };
    },
    onError: (err, newEntry, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/projects", projectId, "subcontractors"], context.previousEntries);
      }
      toast({
        title: "Error",
        description: "Failed to create subcontractor entry",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "subcontractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Entry created",
        description: "Subcontractor entry has been added successfully",
      });
      form.reset({
        projectId: projectId || "",
        contractorName: "",
        cost: "",
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        categoryId: undefined,
      });
      setUploadedReceiptId(null);
      setShowForm(false);
    },
  });

  const handleApplyReceipt = (receipt: Receipt, analysisData: any) => {
    setUploadedReceiptId(receipt.id);
    
    // Populate date if available
    if (analysisData.date) {
      form.setValue("date", analysisData.date);
    }
    
    // Populate contractor name from vendor
    if (analysisData.vendor) {
      form.setValue("contractorName", analysisData.vendor);
    }
    
    // Populate cost from total
    if (analysisData.total) {
      form.setValue("cost", String(analysisData.total));
    }
    
    // Populate description from line items if available
    if (analysisData.lineItems && analysisData.lineItems.length > 0) {
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
      <div className="flex flex-col items-center justify-center h-full p-6" data-testid="subcontractors-empty-state">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project from the sidebar to track subcontractor costs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Subcontractors
          </h1>
          <p className="text-muted-foreground mt-1">Track third-party contractor expenses</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-toggle-form">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Add Entry"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Subcontractor Entry</CardTitle>
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
                    name="contractorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Plumbing Inc." {...field} data-testid="input-contractor-name" />
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
                            placeholder="5000.00" 
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

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="select-category-none">No Category</SelectItem>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id} data-testid={`select-category-${category.id}`}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: category.color || "#3b82f6" }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Installation of HVAC system..." 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg" data-testid={`contractor-name-${entry.id}`}>
                          {entry.contractorName}
                        </h3>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </Badge>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`description-${entry.id}`}>
                          {entry.description}
                        </p>
                      )}
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
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Subcontractor Entries</h3>
              <p className="text-muted-foreground mb-4">
                Track payments to third-party contractors and specialists.
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
