import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Trash2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { GmailAccount, Employee } from "@shared/schema";

const linkAccountSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  gmailEmail: z.string().email("Valid email address required"),
});

type LinkAccountForm = z.infer<typeof linkAccountSchema>;

interface GmailAccountsProps {
  projectId: string | null;
}

export default function GmailAccounts({ projectId }: GmailAccountsProps) {
  const { toast } = useToast();
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<GmailAccount[]>({
    queryKey: ["/api/gmail-accounts"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees/active"],
  });

  const form = useForm<LinkAccountForm>({
    resolver: zodResolver(linkAccountSchema),
    defaultValues: {
      employeeId: "",
      gmailEmail: "",
    },
  });

  const linkAccountMutation = useMutation({
    mutationFn: async (data: LinkAccountForm) => {
      const response = await fetch("/api/gmail-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to link account");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-accounts"] });
      setShowLinkDialog(false);
      form.reset();
      toast({
        title: "Account Linked",
        description: "Gmail account has been linked successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link Gmail account.",
        variant: "destructive",
      });
    },
  });

  const unlinkAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/gmail-accounts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to unlink account");
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-accounts"] });
      toast({
        title: "Account Unlinked",
        description: "Gmail account has been unlinked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unlink Failed",
        description: error.message || "Failed to unlink account.",
        variant: "destructive",
      });
    },
  });

  const syncAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) {
        throw new Error("Please select a project first");
      }
      const response = await fetch(`/api/gmail-accounts/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) throw new Error("Failed to sync account");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-accounts"] });
      toast({
        title: "Sync Initiated",
        description: "Email sync has been started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to initiate sync.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LinkAccountForm) => {
    linkAccountMutation.mutate(data);
  };

  const getSyncStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Synced</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case "syncing":
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gmail Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Link employee Gmail accounts to automatically import receipts from emails
          </p>
        </div>
        <Button
          onClick={() => setShowLinkDialog(true)}
          data-testid="button-link-account"
        >
          <Plus className="h-4 w-4 mr-2" />
          Link Account
        </Button>
      </div>

      {isLoadingAccounts ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading accounts...
        </div>
      ) : accounts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Gmail Accounts Linked</p>
            <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
              Link employee Gmail accounts to automatically scan for receipt emails and import them into BudgetSync Field.
            </p>
            <Button onClick={() => setShowLinkDialog(true)} data-testid="button-link-first-account">
              <Plus className="h-4 w-4 mr-2" />
              Link Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => {
            const employee = employees?.find(e => e.id === account.employeeId);
            return (
              <Card key={account.id} data-testid={`card-gmail-account-${account.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{employee?.name || "Unknown Employee"}</CardTitle>
                    </div>
                    {getSyncStatusBadge(account.syncStatus)}
                  </div>
                  <CardDescription>{account.gmailEmail}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Status:</span>
                        <span>{account.isActive ? "Active" : "Inactive"}</span>
                      </div>
                      {account.lastSyncAt && (
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Last Sync:</span>
                          <span>{new Date(account.lastSyncAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {account.lastError && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                          <p className="text-xs text-destructive">{account.lastError}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => syncAccountMutation.mutate(account.id)}
                        disabled={syncAccountMutation.isPending || !projectId}
                        title={!projectId ? "Please select a project first" : "Sync receipts from Gmail"}
                        data-testid={`button-sync-${account.id}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => unlinkAccountMutation.mutate(account.id)}
                        disabled={unlinkAccountMutation.isPending}
                        data-testid={`button-unlink-${account.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent data-testid="dialog-link-account">
          <DialogHeader>
            <DialogTitle>Link Gmail Account</DialogTitle>
            <DialogDescription>
              Select an employee and enter their Gmail address to start automatically importing receipts from their emails.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id} data-testid={`select-employee-${employee.id}`}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose which employee this Gmail account belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gmailEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gmail Address</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        type="email"
                        placeholder="employee@example.com"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="input-gmail-email"
                      />
                    </FormControl>
                    <FormDescription>
                      The Gmail address to scan for receipt emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLinkDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={linkAccountMutation.isPending}
                  data-testid="button-submit"
                >
                  {linkAccountMutation.isPending ? "Linking..." : "Link Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
