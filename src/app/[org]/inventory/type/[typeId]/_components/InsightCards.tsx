import { CheckCircle2, Clock, Package, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface InsightCardsProps {
  totalItems: number;
  statusInsights: { initial: number; active: number; terminal: number };
}

export const InsightCards: React.FC<InsightCardsProps> = ({
  totalItems,
  statusInsights,
}) => {
  const pct = (n: number) =>
    totalItems > 0
      ? `${Math.round((n / totalItems) * 100)}% of total`
      : "No items yet";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Items
          </CardTitle>
          <Package className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Prepared
          </CardTitle>
          <Clock className="size-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statusInsights.initial}</div>
          <p className="text-muted-foreground text-xs">
            {pct(statusInsights.initial)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Active
          </CardTitle>
          <Zap className="size-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statusInsights.active}</div>
          <p className="text-muted-foreground text-xs">
            {pct(statusInsights.active)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Completed
          </CardTitle>
          <CheckCircle2 className="size-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statusInsights.terminal}</div>
          <p className="text-muted-foreground text-xs">
            {pct(statusInsights.terminal)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
