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
import { insertProgressReportSchema, type ProgressReport, type Receipt, type Category } from "@shared/schema";
import { TrendingUp, Plus, Trash2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ReceiptUploader } from "@/components/ReceiptUploader";

interface ProgressReportsProps {
  projectId: string | null;
}

const materialSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  quantity: z.string().min(1, "Quantity required"),
  unit: z.string().min(1, "Unit required"),
  cost: z.string().min(1, "Cost required"),
  categoryId: z.string().optional(),
});

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
type MaterialFormData = z.infer<typeof materialSchema>;

export default function ProgressReports({ projectId }: ProgressReportsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [materials, setMaterials] = useState<MaterialFormData[]>([]);
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery<ProgressReport[]>({
    queryKey: ["/api/projects", projectId, "progress-reports"],
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
    mutationFn: async (data: FormData) => {
      // Create progress report with materials in a single atomic request
      const reportResponse = await apiRequest("POST", "/api/progress-reports", {
        ...data,
        percentComplete: parseInt(data.percentComplete),
        materials: materials
          .filter(m => m.itemName && m.quantity && m.unit && m.cost)
          .map(m => ({
            ...m,
            categoryId: m.categoryId === "none" ? undefined : m.categoryId,
          })),
      });
      const report = await reportResponse.json();
      
      // Link receipt to progress report if one was uploaded
      if (uploadedReceiptId && report.id) {
        try {
          await apiRequest("POST", `/api/receipts/${uploadedReceiptId}/link`, {
            entryType: "material",
            entryId: report.id,
          });
        } catch (error) {
          console.error("Failed to link receipt:", error);
        }
      }
      
      return report;
    },
    onMutate: async (newReport) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects", projectId, "progress-reports"] });
      
      const previousReports = queryClient.getQueryData<ProgressReport[]>(["/api/projects", projectId, "progress-reports"]);
      
      const optimisticReport = {
        id: `temp-${Date.now()}`,
        projectId: newReport.projectId,
        percentComplete: parseInt(newReport.percentComplete),
        date: newReport.date,
        notes: newReport.notes || null,
        photoUrls: null,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData<ProgressReport[]>(
        ["/api/projects", projectId, "progress-reports"],
        (old) => [optimisticReport as ProgressReport, ...(old || [])]
      );
      
      return { previousReports };
    },
    onError: (err, newReport, context) => {
      if (context?.previousReports) {
        queryClient.setQueryData(["/api/projects", projectId, "progress-reports"], context.previousReports);
      }
      toast({
        title: "Error",
        description: "Failed to save progress report. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "progress-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Progress Report Added",
        description: `Progress report with ${materials.length} material${materials.length !== 1 ? 's' : ''} has been saved successfully.`,
      });
      form.reset({
        projectId: projectId || "",
        percentComplete: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setMaterials([]);
      setUploadedReceiptId(null);
      setShowForm(false);
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const addMaterial = () => {
    setMaterials([...materials, { itemName: "", quantity: "", unit: "", cost: "", categoryId: undefined }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof MaterialFormData, value: string) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const handleApplyReceipt = (receipt: Receipt, analysisData: any) => {
    setUploadedReceiptId(receipt.id);
    
    // Populate date if available
    if (analysisData.date) {
      form.setValue("date", analysisData.date);
    }
    
    // Populate materials from line items
    if (analysisData.lineItems && analysisData.lineItems.length > 0) {
      const newMaterials = analysisData.lineItems.map((item: any) => ({
        itemName: item.description || "",
        quantity: item.quantity ? String(item.quantity) : "",
        unit: item.unit || "",
        cost: item.total ? String(item.total) : (item.price ? String(item.price) : ""),
      }));
      setMaterials(newMaterials);
      
      toast({
        title: "Receipt Applied",
        description: `Added ${newMaterials.length} material${newMaterials.length !== 1 ? 's' : ''} from receipt.`,
      });
    } else if (analysisData.total) {
      // If no line items, create a single material with vendor name and total
      setMaterials([{
        itemName: analysisData.vendor || "Materials",
        quantity: "1",
        unit: "lot",
        cost: String(analysisData.total),
      }]);
      
      toast({
        title: "Receipt Applied",
        description: "Added material entry from receipt total.",
      });
    }
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Receipt Upload Section */}
                {projectId && (
                  <ReceiptUploader
                    projectId={projectId}
                    onApply={handleApplyReceipt}
                    acceptMultipleLineItems={true}
                  />
                )}

                {/* Materials Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-foreground">Materials Used</h3>
                      <p className="text-sm text-muted-foreground">Track materials consumed during this period</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMaterial}
                      data-testid="button-add-material"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Material
                    </Button>
                  </div>

                  {materials.length > 0 && (
                    <div className="space-y-3">
                      {materials.map((material, index) => (
                        <Card key={index} className="p-4" data-testid={`card-material-${index}`}>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div className="md:col-span-2">
                              <Input
                                placeholder="Item name (e.g., Concrete)"
                                value={material.itemName}
                                onChange={(e) => updateMaterial(index, "itemName", e.target.value)}
                                data-testid={`input-material-name-${index}`}
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Quantity"
                                value={material.quantity}
                                onChange={(e) => updateMaterial(index, "quantity", e.target.value)}
                                data-testid={`input-material-quantity-${index}`}
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Unit (e.g., cubic yards)"
                                value={material.unit}
                                onChange={(e) => updateMaterial(index, "unit", e.target.value)}
                                data-testid={`input-material-unit-${index}`}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Cost ($)"
                                value={material.cost}
                                onChange={(e) => updateMaterial(index, "cost", e.target.value)}
                                data-testid={`input-material-cost-${index}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMaterial(index)}
                                data-testid={`button-remove-material-${index}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Select
                              value={material.categoryId || "none"}
                              onValueChange={(value) => updateMaterial(index, "categoryId", value === "none" ? undefined : value)}
                            >
                              <SelectTrigger data-testid={`select-material-category-${index}`}>
                                <SelectValue placeholder="Select category (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Category</SelectItem>
                                {categories?.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
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
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {materials.length === 0 && (
                    <Card className="p-8">
                      <div className="flex flex-col items-center text-center">
                        <Package className="w-10 h-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No materials added yet. Click "Add Material" to track material usage.
                        </p>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setMaterials([]);
                    }}
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
          reports.map((report: ProgressReport) => (
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
