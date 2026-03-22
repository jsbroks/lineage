import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Pencil } from "lucide-react";
import type { ItemType, OperationType } from "~/server/db/schema";
import type { operationTypeInputItem } from "~/server/db/schema";

type Port = typeof operationTypeInputItem.$inferSelect;

type PortRowProps = {
  port: Port;
  itemType: ItemType;
};

const PortRow: React.FC<PortRowProps> = ({ port, itemType }) => {
  return (
    <div key={port.id}>
      {itemType.name}{" "}
      <Badge variant="ghost" className="bg-muted text-muted-foreground text-xs">
        {port.referenceKey}
      </Badge>
    </div>
  );
};

type OperationCardProps = {
  operationType: OperationType;
  ports: Port[];
  itemTypes: ItemType[];
  org: string;
};

export const OperationCard: React.FC<OperationCardProps> = ({
  operationType,
  ports,
  itemTypes,
  org,
}) => {
  return (
    <Link
      href={`/${org}/settings/operations/${operationType.id}`}
      className="group block"
    >
      <Card className="group-hover:border-foreground/20 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{operationType.name}</CardTitle>
            <Pencil className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardDescription>{operationType.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div>
            <p className="text-muted-foreground mb-1 text-xs uppercase">
              Input Items
            </p>
            <div className="space-y-0.5">
              {ports.map((port) => (
                <PortRow
                  key={port.id}
                  port={port}
                  itemType={
                    itemTypes.find(
                      (itemType) => itemType.id === port.itemTypeId,
                    )!
                  }
                />
              ))}
              {ports.length === 0 && (
                <div className="text-muted-foreground pt-1 text-xs">
                  No input items defined
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
