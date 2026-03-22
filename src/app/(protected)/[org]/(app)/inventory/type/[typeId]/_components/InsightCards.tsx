import { Clock, Package, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface InsightCardsProps {
  totalItems: number;
  statusInsights: { initial: number; active: number; terminal: number };
}

export const InsightCards: React.FC<InsightCardsProps> = ({
  statusInsights,
}) => {
  const inProgress = statusInsights.initial + statusInsights.active;

  const pct = (n: number) =>
    inProgress > 0
      ? `${Math.round((n / inProgress) * 100)}% of in progress`
      : "No items yet";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            In Progress
          </CardTitle>
          <Package className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inProgress}</div>
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
    </div>
  );
};
