import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ArrowRight, Pencil } from "lucide-react";
import type {
  ItemType,
  OperationType,
  OperationTypePort,
} from "~/server/db/schema";

type PortRowProps = {
  port: OperationTypePort;
  itemType: ItemType;
};

const PortRow: React.FC<PortRowProps> = ({ port, itemType }) => {
  return (
    <div key={port.id}>
      {itemType.name}{" "}
      {port.isConsumed ? (
        <Badge
          variant="ghost"
          className="bg-orange-300/20 text-xs text-orange-600"
        >
          Consumed
        </Badge>
      ) : (
        <Badge
          variant="ghost"
          className="bg-green-300/20 text-xs text-green-600"
        >
          Kept
        </Badge>
      )}
    </div>
  );
};

type OperationCardProps = {
  operationType: OperationType;
  ports: OperationTypePort[];
  itemTypes: ItemType[];
  org: string;
};

export const OperationCard: React.FC<OperationCardProps> = ({
  operationType,
  ports,
  itemTypes,
  org,
}) => {
  const inputPorts = ports.filter((port) => port.direction === "input");
  const outputPorts = ports.filter((port) => port.direction === "output");

  const getItemTypeName = (itemTypeId: string) => {
    return itemTypes.find((itemType) => itemType.id === itemTypeId)?.name;
  };
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
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div className="col-span-1">
              <p className="text-muted-foreground mb-1 text-xs uppercase">
                Inputs
              </p>
              <div className="space-y-0.5">
                {inputPorts.map((port) => (
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
              </div>
            </div>

            <div className="text-muted-foreground flex h-full justify-center pt-6">
              <ArrowRight className="size-4" />
            </div>

            <div className="col-span-1">
              <p className="text-muted-foreground mb-1 text-xs uppercase">
                Outputs
              </p>

              {outputPorts.length == 0 && (
                <div className="text-muted-foreground pt-1 text-xs">
                  Links{" "}
                  {inputPorts
                    .map((port) => getItemTypeName(port.itemTypeId))
                    .join(", ")}{" "}
                  via lineage
                </div>
              )}
              <div>
                {outputPorts.map((port) => (
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
