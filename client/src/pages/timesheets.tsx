import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTimesheetSchema, type Timesheet, type Employee, type Category } from "@shared/schema";
import { Clock, Plus, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { parseNumericInput, isPositiveNumber } from "@/lib/numberUtils";

interface TimesheetsProps {
  projectId: string | null;
}

const formSchema = insertTimesheetSchema.extend({
  hours: z.string().min(1, "Hours required").refine(isPositiveNumber, {
    message: "Hours must be a positive number",
  }),
  payRate: z.string().min(1, "Pay rate required").refine(isPositiveNumber, {
    message: "Pay rate must be a positive number",
  }),
  date: z.string().min(1, "Date required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Timesheets({ projectId }: TimesheetsProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/projects", projectId, "timesheets"],
    enabled: !!projectId,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees/active"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/projects", projectId, "categories"],
    enabled: !!projectId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: projectId || "",
      employeeName: "",
      hours: "",
      payRate: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      categoryId: undefined,
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
      const response = await apiRequest("POST", "/api/timesheets", {
        ...data,
        hours: parseNumericInput(data.hours),
        payRate: parseNumericInput(data.payRate),
        categoryId: data.categoryId === "none" ? undefined : data.categoryId,
      });
      return response.json();
    },
    onMutate: async (newTimesheet) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects", projectId, "timesheets"] });
      
      const previousTimesheets = queryClient.getQueryData<Timesheet[]>(["/api/projects", projectId, "timesheets"]);
      
      const optimisticTimesheet = {
        id: `temp-${Date.now()}`,
        projectId: newTimesheet.projectId,
        employeeName: newTimesheet.employeeName,
        hours: newTimesheet.hours,
        payRate: newTimesheet.payRate,
        date: newTimesheet.date,
        notes: newTimesheet.notes || null,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData<Timesheet[]>(
        ["/api/projects", projectId, "timesheets"],
        (old) => [optimisticTimesheet as Timesheet, ...(old || [])]
      );
      
      return { previousTimesheets };
    },
    onError: (err, newTimesheet, context) => {
      if (context?.previousTimesheets) {
        queryClient.setQueryData(["/api/projects", projectId, "timesheets"], context.previousTimesheets);
      }
      toast({
        title: "Error",
        description: "Failed to save timesheet. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Timesheet Added",
        description: "Timesheet entry has been saved successfully.",
      });
      form.reset({
        projectId: projectId || "",
        employeeName: "",
        hours: "",
        payRate: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        categoryId: undefined,
      });
      setShowForm(false);
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project to enter timesheets and track labor costs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Timesheets</h1>
          <p className="text-muted-foreground mt-1">Track employee hours and labor costs</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          data-testid="button-add-timesheet"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {showForm && (
        <Card data-testid="card-timesheet-form">
          <CardHeader>
            <CardTitle className="text-lg">New Timesheet Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-fill pay rate when employee is selected
                          const selectedEmployee = employees?.find(e => e.name === value);
                          if (selectedEmployee) {
                            // payRate is a string from the database (decimal type)
                            const payRateNumber = typeof selectedEmployee.payRate === 'string' 
                              ? parseFloat(selectedEmployee.payRate) 
                              : selectedEmployee.payRate;
                            
                            // Guard against NaN
                            if (!isNaN(payRateNumber) && isFinite(payRateNumber)) {
                              form.setValue("payRate", payRateNumber.toFixed(2));
                            } else {
                              toast({
                                title: "Invalid Pay Rate",
                                description: "Employee has an invalid pay rate. Please enter manually.",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        value={field.value}
                        disabled={isLoadingEmployees}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-employee" disabled={isLoadingEmployees}>
                            <SelectValue placeholder={isLoadingEmployees ? "Loading employees..." : "Select employee"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => {
                            const payRateNumber = typeof employee.payRate === 'string'
                              ? parseFloat(employee.payRate)
                              : employee.payRate;
                            const displayRate = !isNaN(payRateNumber) && isFinite(payRateNumber)
                              ? payRateNumber.toFixed(2)
                              : '0.00';
                            return (
                              <SelectItem key={employee.id} value={employee.name} data-testid={`select-employee-${employee.id}`}>
                                {employee.name} (${displayRate}/hr)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Worked</FormLabel>
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
                    name="payRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Rate ($/hr)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="25.00" 
                            {...field} 
                            data-testid="input-pay-rate"
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this timesheet entry..."
                          className="min-h-20"
                          {...field}
                          value={field.value || ""}
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
                    data-testid="button-submit-timesheet"
                  >
                    {createMutation.isPending ? "Saving..." : "Save Timesheet"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Timesheets List */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : timesheets && timesheets.length > 0 ? (
          timesheets.map((timesheet) => (
            <Card key={timesheet.id} data-testid={`card-timesheet-${timesheet.id}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-foreground" data-testid="text-employee-name">
                      {timesheet.employeeName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(timesheet.date), "MMMM d, yyyy")}
                    </p>
                    {timesheet.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{timesheet.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="text-xl font-mono font-bold" data-testid="text-hours">
                        {parseFloat(timesheet.hours).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Rate</p>
                      <p className="text-xl font-mono font-bold" data-testid="text-rate">
                        ${parseFloat(timesheet.payRate).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <Badge variant="secondary" className="text-base font-mono font-semibold px-3 py-1" data-testid="badge-total-cost">
                        ${(parseFloat(timesheet.hours) * parseFloat(timesheet.payRate)).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Timesheets Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking labor costs by adding timesheet entries.
              </p>
              <Button onClick={() => setShowForm(true)} data-testid="button-add-first-timesheet">
                <Plus className="w-4 h-4 mr-2" />
                Add First Timesheet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
