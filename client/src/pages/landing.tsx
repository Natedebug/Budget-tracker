import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, ClipboardList, DollarSign, TrendingDown, Download, CheckCircle2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2">
              <HardHat className="h-12 w-12 text-primary" />
              <h1 className="text-5xl font-bold tracking-tight">
                BudgetSync Field
              </h1>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-muted-foreground">
              Construction budget tracking that works as hard as you do. Track costs, monitor progress, and stay on budget—all from your mobile device.
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                className="text-lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Built for the Field</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Everything you need to manage construction budgets on-site
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <ClipboardList className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Daily Tracking</CardTitle>
              <CardDescription>
                Log timesheets, equipment usage, and progress reports in seconds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Quick timesheet entry with automatic cost calculations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Equipment logs with fuel and rental tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Progress percentage updates with notes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>
                Track spending across all major cost categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Labor costs with hours and pay rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Materials and equipment expenses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Subcontractor and overhead tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingDown className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Real-Time Insights</CardTitle>
              <CardDescription>
                Know exactly where your budget stands at all times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Daily burn rate and spending trends</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Projected final cost based on progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Color-coded budget health indicators</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Multi-Project Section */}
      <div className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Manage Multiple Projects</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Switch between jobs with ease. Each project maintains its own budget, timesheets, and reports.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Independent budget tracking for each project</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Quick project switching from the sidebar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Separate CSV exports for each job</span>
                </li>
              </ul>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-md">
                  <span className="font-medium">Downtown Office Renovation</span>
                  <span className="text-sm text-green-600 font-semibold">Under Budget</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium">Harbor Bridge Expansion</span>
                  <span className="text-sm text-yellow-600 font-semibold">On Track</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium">Westside Plaza Complex</span>
                  <span className="text-sm text-muted-foreground">15% Complete</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <Download className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Export Your Data</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate comprehensive CSV reports with all project data including timesheets, equipment logs, progress reports, and budget breakdowns.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Track Your Budget?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join construction professionals who trust BudgetSync Field to keep their projects on budget.
          </p>
          <Button
            size="lg"
            className="text-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login-footer"
          >
            Sign In to Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
