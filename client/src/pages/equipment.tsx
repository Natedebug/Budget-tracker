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
import { insertEquipmentLogSchema, type EquipmentLog, type Receipt } from "@shared/schema";
import { Truck, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ReceiptUploader } from "@/components/ReceiptUploader";

interface EquipmentProps {
  projectId: string | null;
}

const formSchema = insertEquipmentLogSchema.extend({
  hours: z.string().min(1, "Hours required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Hours must be a positive number",
  }),
  fuelCost: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Fuel cost must be a non-negative number",
  }),
  rentalCost: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Rental cost must be a non-negative number",
  }),
  date: z.string().min(1, "Date required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Equipment({ projectId }: EquipmentProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [uploadedReceiptId, setUploadedReceiptId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery<EquipmentLog[]>({
    queryKey: ["/api/projects", projectId, "equipment"],
    enabled: !!projectId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId || "",
      equipmentName: "",
      hours: "",
      fuelCost: "0",
      rentalCost: "0",
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
      const response = await apiRequest("POST", "/api/equipment", {
        ...data,
        hours: parseFloat(data.hours),
        fuelCost: parseFloat(data.fuelCost),
        rentalCost: parseFloat(data.rentalCost),
      });
      const log = await response.json();
      
      // Link receipt to equipment log if one was uploaded
      if (uploadedReceiptId && log.id) {
        try {
          await apiRequest("POST", `/api/receipts/${uploadedReceiptId}/link`, {
            entryType: "equipment",
            entryId: log.id,
          });
        } catch (error) {
          console.error("Failed to link receipt:", error);
        }
      }
      
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Equipment Log Added",
        description: "Equipment entry has been saved successfully.",
      });
      form.reset({
        projectId: projectId || "",
        equipmentName: "",
        hours: "",
        fuelCost: "0",
        rentalCost: "0",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setUploadedReceiptId(null);
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save equipment log. Please try again.",
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
    
    // Populate equipment name from vendor
    if (analysisData.vendor) {
      form.setValue("equipmentName", analysisData.vendor);
    }
    
    // Try to extract costs from line items or total
    if (analysisData.lineItems && analysisData.lineItems.length > 0) {
      const item = analysisData.lineItems[0];
      if (item.description && item.description.toLowerCase().includes("fuel")) {
        form.setValue("fuelCost", String(item.total || 0));
      } else if (item.description && (item.description.toLowerCase().includes("rent") || item.description.toLowerCase().includes("lease"))) {
        form.setValue("rentalCost", String(item.total || 0));
      } else if (analysisData.total) {
        form.setValue("rentalCost", String(analysisData.total));
      }
    } else if (analysisData.total) {
      form.setValue("rentalCost", String(analysisData.total));
    }
    
    toast({
      title: "Receipt Applied",
      description: "Form fields populated from receipt data.",
    });
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Truck className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project to track equipment usage and costs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Equipment Logs</h1>
          <p className="text-muted-foreground mt-1">Track equipment hours, fuel, and rental costs</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-equipment"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Log
        </Button>
      </div>

      {showForm && (
        <Card data-testid="card-equipment-form">
          <CardHeader>
            <CardTitle className="text-lg">New Equipment Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {projectId && (
                  <ReceiptUploader
                    projectId={projectId}
                    onApply={handleApplyReceipt}
                  />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="equipmentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Excavator, Crane, etc." 
                            {...field} 
                            data-testid="input-equipment-name"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Used</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.25"
                            placeholder="8.0" 
                            {...field} 
                            data-testid="input-hours"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuelCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Cost ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="150.00" 
                            {...field} 
                            data-testid="input-fuel-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rentalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rental Cost ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="500.00" 
                            {...field} 
                            data-testid="input-rental-cost"
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional details about equipment usage..."
                          className="min-h-20"
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
                    data-testid="button-submit-equipment"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Log"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Equipment Logs List */}
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
        ) : logs && logs.length > 0 ? (
          logs.map((log) => {
            const totalCost = parseFloat(log.fuelCost) + parseFloat(log.rentalCost);
            return (
              <Card key={log.id} data-testid={`card-equipment-${log.id}`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-foreground" data-testid="text-equipment-name">
                        {log.equipmentName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.date), "MMMM d, yyyy")}
                      </p>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Hours</p>
                        <p className="text-xl font-mono font-bold" data-testid="text-hours">
                          {parseFloat(log.hours).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Fuel</p>
                        <p className="text-base font-mono" data-testid="text-fuel">
                          ${parseFloat(log.fuelCost).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Rental</p>
                        <p className="text-base font-mono" data-testid="text-rental">
                          ${parseFloat(log.rentalCost).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <Badge variant="secondary" className="text-base font-mono font-semibold px-3 py-1" data-testid="badge-total-cost">
                          ${totalCost.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Equipment Logs Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking equipment costs by adding logs.
              </p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first-log">
                <Plus className="w-4 h-4 mr-2" />
                Add First Log
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
