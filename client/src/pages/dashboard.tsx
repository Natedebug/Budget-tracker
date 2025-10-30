import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingDown, TrendingUp, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: number;
}

interface BudgetStats {
  totalBudget: number;
  totalSpent: number;
  spentToday: number;
  remaining: number;
  percentUsed: number;
  percentComplete: number;
  laborSpent: number;
  materialsSpent: number;
  equipmentSpent: number;
  subcontractorsSpent: number;
  overheadSpent: number;
  projectedFinalCost: number;
  variance: number;
  dailyBurnRate: number;
  daysRemaining: number;
  categoryBreakdown?: CategoryBreakdownItem[];
  uncategorizedTotal?: number;
}

interface DashboardProps {
  projectId: string | null;
}

export default function Dashboard({ projectId }: DashboardProps) {
  const { data: stats, isLoading, error } = useQuery<BudgetStats>({
    queryKey: ["/api/projects", projectId, "stats"],
    enabled: !!projectId,
  });

  const [budgetStatus, setBudgetStatus] = useState<"under" | "approaching" | "over">("under");

  useEffect(() => {
    if (stats) {
      if (stats.percentUsed >= 100) {
        setBudgetStatus("over");
      } else if (stats.percentUsed >= 85) {
        setBudgetStatus("approaching");
      } else {
        setBudgetStatus("under");
      }
    }
  }, [stats]);

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6" data-testid="dashboard-empty-state">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a project from the sidebar to view budget tracking and daily reports.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="dashboard-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load budget statistics. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Budget Status Alert */}
      {budgetStatus === "over" && (
        <Alert variant="destructive" data-testid="alert-over-budget">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="text-base">
            <strong>Budget Exceeded!</strong> You've spent {stats.percentUsed.toFixed(1)}% of the total budget.
          </AlertDescription>
        </Alert>
      )}
      
      {budgetStatus === "approaching" && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-approaching-budget">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-base text-yellow-900 dark:text-yellow-100">
            <strong>Approaching Budget Limit!</strong> You've used {stats.percentUsed.toFixed(1)}% of your total budget.
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Metrics */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5" data-testid="card-budget-overview">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
            <p className="text-2xl md:text-3xl font-mono font-bold text-foreground" data-testid="text-total-budget">
              {formatCurrency(stats.totalBudget)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Spent Today</p>
            <p className="text-2xl md:text-3xl font-mono font-bold text-primary" data-testid="text-spent-today">
              {formatCurrency(stats.spentToday)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl md:text-3xl font-mono font-bold text-foreground" data-testid="text-total-spent">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Remaining</p>
            <p className="text-2xl md:text-3xl font-mono font-bold text-secondary" data-testid="text-remaining">
              {formatCurrency(stats.remaining)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Budget Progress Bar */}
      <Card data-testid="card-budget-progress">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Budget Usage</CardTitle>
            <Badge 
              variant={budgetStatus === "over" ? "destructive" : budgetStatus === "approaching" ? "secondary" : "default"}
              data-testid={`badge-status-${budgetStatus}`}
            >
              {stats.percentUsed.toFixed(1)}% Used
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress 
            value={Math.min(stats.percentUsed, 100)} 
            className="h-3"
            data-testid="progress-budget"
          />
          <p className="text-sm text-muted-foreground">
            {formatCurrency(stats.totalSpent)} of {formatCurrency(stats.totalBudget)} spent
          </p>
        </CardContent>
      </Card>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card data-testid="card-percent-complete">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold" data-testid="text-percent-complete">
              {stats.percentComplete}%
            </div>
            <Progress value={stats.percentComplete} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-daily-burn">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Burn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold" data-testid="text-daily-burn">
              {formatCurrency(stats.dailyBurnRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per day average</p>
          </CardContent>
        </Card>

        <Card data-testid="card-projected-cost">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projected Final</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold" data-testid="text-projected-cost">
              {formatCurrency(stats.projectedFinalCost)}
            </div>
            {stats.variance !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${stats.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {stats.variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatCurrency(Math.abs(stats.variance))} {stats.variance > 0 ? 'over' : 'under'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Type Breakdown */}
      <Card data-testid="card-cost-type-breakdown">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Cost Breakdown by Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <CategoryItem 
              label="Labor" 
              spent={stats.laborSpent} 
              color="bg-chart-1"
              testId="category-labor"
            />
            <CategoryItem 
              label="Materials" 
              spent={stats.materialsSpent} 
              color="bg-chart-2"
              testId="category-materials"
            />
            <CategoryItem 
              label="Equipment" 
              spent={stats.equipmentSpent} 
              color="bg-chart-3"
              testId="category-equipment"
            />
            <CategoryItem 
              label="Subcontractors" 
              spent={stats.subcontractorsSpent} 
              color="bg-chart-4"
              testId="category-subcontractors"
            />
            <CategoryItem 
              label="Overhead" 
              spent={stats.overheadSpent} 
              color="bg-chart-5"
              testId="category-overhead"
            />
          </div>
        </CardContent>
      </Card>

      {/* User-Defined Category Breakdown */}
      {((stats.categoryBreakdown?.length || 0) > 0 || (stats.uncategorizedTotal || 0) > 0) && (
        <Card data-testid="card-user-category-breakdown">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Cost Breakdown by Budget Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {stats.categoryBreakdown?.map((category) => (
                <CategoryItem
                  key={category.categoryId}
                  label={category.categoryName}
                  spent={category.total}
                  color={category.categoryColor || "bg-muted"}
                  customColor={category.categoryColor}
                  testId={`user-category-${category.categoryId}`}
                />
              ))}
              {stats.uncategorizedTotal > 0 && (
                <CategoryItem
                  label="Uncategorized"
                  spent={stats.uncategorizedTotal}
                  color="bg-muted"
                  testId="user-category-uncategorized"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryItem({ label, spent, color, customColor, testId }: { label: string; spent: number; color: string; customColor?: string | null; testId: string }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex items-center justify-between" data-testid={testId}>
      <div className="flex items-center gap-3 flex-1">
        {customColor ? (
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: customColor }} />
        ) : (
          <div className={`w-3 h-3 rounded-sm ${color}`} />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-mono font-semibold" data-testid={`${testId}-amount`}>
        {formatCurrency(spent)}
      </span>
    </div>
  );
}
