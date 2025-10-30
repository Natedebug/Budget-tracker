import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type ChangeOrder, insertChangeOrderSchema, type InsertChangeOrder } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending", icon: Clock, color: "text-yellow-600" },
  { value: "Approved", label: "Approved", icon: CheckCircle2, color: "text-green-600" },
  { value: "Rejected", label: "Rejected", icon: XCircle, color: "text-red-600" },
] as const;

interface ChangeOrdersProps {
  projectId: string | null;
}

export default function ChangeOrders({ projectId }: ChangeOrdersProps) {
  const { toast } = useToast();
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: changeOrders, isLoading } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/projects", projectId, "change-orders"],
    enabled: !!projectId,
  });

  const form = useForm<InsertChangeOrder>({
    resolver: zodResolver(insertChangeOrderSchema.omit({ projectId: true })),
    defaultValues: {
      changeOrderNumber: "",
      description: "",
      amount: "0",
      status: "Pending",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertChangeOrder) => {
      return await apiRequest("POST", `/api/projects/${projectId}/change-orders`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Change order created",
        description: "The change order has been created successfully.",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create change order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertChangeOrder> }) => {
      return await apiRequest("PATCH", `/api/change-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Change order updated",
        description: "The change order has been updated successfully.",
      });
      form.reset();
      setEditingChangeOrder(null);
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update change order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/change-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "change-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });
      toast({
        title: "Change order deleted",
        description: "The change order has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete change order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertChangeOrder) => {
    if (editingChangeOrder) {
      updateMutation.mutate({ id: editingChangeOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (changeOrder: ChangeOrder) => {
    setEditingChangeOrder(changeOrder);
    form.reset({
      changeOrderNumber: changeOrder.changeOrderNumber,
      description: changeOrder.description,
      amount: changeOrder.amount,
      status: changeOrder.status as "Pending" | "Approved" | "Rejected",
      date: changeOrder.date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this change order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingChangeOrder(null);
      form.reset();
    }
  };

  if (!projectId) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
            <CardDescription>Please select a project to manage change orders.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    if (!option) return null;
    const Icon = option.icon;
    return <Icon className={`h-4 w-4 ${option.color}`} />;
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || "";
  };

  // Calculate totals by status
  const totals = {
    pending: changeOrders?.filter(co => co.status === "Pending").reduce((sum, co) => sum + parseFloat(co.amount || "0"), 0) || 0,
    approved: changeOrders?.filter(co => co.status === "Approved").reduce((sum, co) => sum + parseFloat(co.amount || "0"), 0) || 0,
    rejected: changeOrders?.filter(co => co.status === "Rejected").reduce((sum, co) => sum + parseFloat(co.amount || "0"), 0) || 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Change Orders</h1>
            <p className="text-muted-foreground">Track budget adjustments and scope changes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-change-order">
                <Plus className="h-4 w-4 mr-2" />
                Add Change Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingChangeOrder ? "Edit Change Order" : "Add Change Order"}
                </DialogTitle>
                <DialogDescription>
                  {editingChangeOrder 
                    ? "Update the change order details below."
                    : "Enter the change order information below."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="changeOrderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Order Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="CO-001"
                            data-testid="input-change-order-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Additional work requested..."
                            rows={3}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                data-testid={`status-${option.value.toLowerCase()}`}
                              >
                                <div className="flex items-center gap-2">
                                  <option.icon className={`h-4 w-4 ${option.color}`} />
                                  {option.label}
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
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit"
                    >
                      {editingChangeOrder ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-pending">
                ${totals.pending.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-approved">
                ${totals.approved.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-rejected">
                ${totals.rejected.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Loading change orders...</p>
          </CardContent>
        </Card>
      ) : !changeOrders || changeOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No change orders yet</p>
              <p className="text-sm text-muted-foreground">
                Track budget adjustments and scope changes for this project
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Change Orders</CardTitle>
            <CardDescription>
              Manage all change orders for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {changeOrders.map((changeOrder) => (
                <div
                  key={changeOrder.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`change-order-${changeOrder.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-semibold" data-testid={`co-number-${changeOrder.id}`}>
                        {changeOrder.changeOrderNumber}
                      </span>
                      <div className={`flex items-center gap-1 ${getStatusColor(changeOrder.status)}`}>
                        {getStatusIcon(changeOrder.status)}
                        <span className="text-sm font-medium">{changeOrder.status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(changeOrder.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {changeOrder.description}
                    </p>
                    <div className="text-lg font-bold" data-testid={`co-amount-${changeOrder.id}`}>
                      ${parseFloat(changeOrder.amount || "0").toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(changeOrder)}
                      data-testid={`button-edit-${changeOrder.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(changeOrder.id)}
                      data-testid={`button-delete-${changeOrder.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
