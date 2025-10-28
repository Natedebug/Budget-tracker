import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, AlertCircle, CheckCircle, Inbox, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { GmailConnection } from "@shared/schema";

const connectSchema = z.object({
  gmailEmail: z.string().email("Valid email address required"),
  description: z.string().optional(),
});

type ConnectForm = z.infer<typeof connectSchema>;

interface GmailConnectionPageProps {
  projectId: string | null;
}

export default function GmailConnectionPage({ projectId }: GmailConnectionPageProps) {
  const { toast } = useToast();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  const { data: connection, isLoading } = useQuery<GmailConnection | null>({
    queryKey: ["/api/gmail-connection"],
  });

  const form = useForm<ConnectForm>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      gmailEmail: "",
      description: "Company receipts inbox",
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (data: ConnectForm) => {
      const response = await fetch("/api/gmail-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to connect Gmail");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-connection"] });
      setShowConnectDialog(false);
      form.reset();
      toast({
        title: "Connected",
        description: "Gmail account connected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Gmail account.",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/gmail-connection", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to disconnect");
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-connection"] });
      toast({
        title: "Disconnected",
        description: "Gmail account has been disconnected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect account.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) {
        throw new Error("Please select a project first");
      }
      const response = await fetch("/api/gmail-connection/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) throw new Error("Failed to sync");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-connection"] });
      toast({
        title: "Sync Initiated",
        description: "Scanning emails for receipts in the background...",
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

  const onSubmit = (data: ConnectForm) => {
    connectMutation.mutate(data);
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gmail Connection</h1>
        <p className="text-muted-foreground mt-2">
          Connect a company Gmail inbox to automatically import receipt emails
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : !connection ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Gmail Connected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect a company Gmail account where employees forward their receipts. 
              BudgetSync will automatically scan for receipt emails and import them.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-6 max-w-md">
              <p className="text-sm font-medium mb-2">💡 Suggested Workflow:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Create a dedicated email like receipts@yourcompany.com</li>
                <li>Have employees forward receipts to this address</li>
                <li>Connect that email here for automatic import</li>
              </ol>
            </div>
            <Button onClick={() => setShowConnectDialog(true)} data-testid="button-connect-gmail">
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-gmail-connection">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Company Receipts Inbox</CardTitle>
                  <CardDescription className="mt-1">{connection.gmailEmail}</CardDescription>
                </div>
              </div>
              {getSyncStatusBadge(connection.syncStatus)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connection.description && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{connection.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{connection.isActive ? "Active" : "Inactive"}</p>
              </div>
              {connection.lastSyncAt && (
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>
                  <p className="font-medium">
                    {new Date(connection.lastSyncAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {connection.lastError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">Error:</p>
                <p className="text-xs text-destructive mt-1">{connection.lastError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !projectId}
                title={!projectId ? "Please select a project first" : "Scan for new receipt emails"}
                data-testid="button-sync"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {syncMutation.isPending ? "Syncing..." : "Sync Now"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {!projectId && (
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Select a project from the sidebar to enable sync
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent data-testid="dialog-connect">
          <DialogHeader>
            <DialogTitle>Connect Gmail Account</DialogTitle>
            <DialogDescription>
              Enter the company Gmail address where employees forward receipts
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="gmailEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gmail Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="receipts@company.com"
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Company receipts inbox"
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConnectDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={connectMutation.isPending}
                  data-testid="button-submit"
                >
                  {connectMutation.isPending ? "Connecting..." : "Connect"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
