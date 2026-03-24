import { Hash, InfoIcon, PackagePlus, Tag } from "lucide-react";
import type { ScanContext, ScanWorkflow, WorkflowPanel } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";

const CreateLotTypePanel: WorkflowPanel = ({ ctx, onComplete }) => {
  const addTypeIdentifierMutation = api.lotType.addIdentifier.useMutation();
  const lotTypesQuery = api.lotType.list.useQuery();
  const utils = api.useUtils();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const typeDetailQuery = api.lotType.getById.useQuery(
    { id: selectedTypeId },
    { enabled: !!selectedTypeId },
  );

  const variants =
    typeDetailQuery.data?.variants.filter((v) => v.isActive) ?? [];

  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    setSelectedVariantId("");
  };

  const handleLink = async () => {
    if (!selectedTypeId) return;
    setError(null);

    const unknownCode = ctx.unknowns[0];
    if (!unknownCode) return;

    const identifierType = unknownCode.codeType ?? "Unknown";
    const identifierValue = unknownCode.code;

    try {
      await addTypeIdentifierMutation.mutateAsync({
        lotTypeId: selectedTypeId,
        variantId: selectedVariantId || null,
        identifierType,
        identifierValue,
      });

      await utils.lotType.list.invalidate();
      const typeName = lotTypesQuery.data?.find(
        (t) => t.id === selectedTypeId,
      )?.name;
      const variantName = variants.find(
        (v) => v.id === selectedVariantId,
      )?.name;
      const label = variantName
        ? `"${typeName} > ${variantName}"`
        : `"${typeName}"`;
      onComplete({
        message: `Linked "${identifierValue}" to ${label}.`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link code");
    }
  };

  return (
    <div className="flex flex-1 flex-col space-y-2 overflow-y-auto p-4">
      <label className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wide uppercase">
        Link Code
      </label>

      <Alert>
        <InfoIcon />
        <AlertTitle className="text-sm">Link to a product</AlertTitle>
        <AlertDescription className="text-xs">
          Associate codes with a product. Next time you scan it, the system will
          recognize it and offer actions like creating new lots, tracking
          inventory, or running activities.
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium">
          <Tag className="text-muted-foreground size-3.5" />
          Associate with <span className="text-destructive">*</span>
        </label>
        <Select value={selectedTypeId} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select product..." />
          </SelectTrigger>
          <SelectContent>
            {lotTypesQuery.data?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTypeId && variants.length > 0 && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <Hash className="text-muted-foreground size-3.5" />
            Variety
          </label>
          <Select
            value={selectedVariantId}
            onValueChange={setSelectedVariantId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select variety..." />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <Button disabled={!selectedTypeId} onClick={() => void handleLink()}>
        Link
      </Button>
    </div>
  );
};

export const createLotTypeWorkflow: ScanWorkflow = {
  id: "create-lot-type",
  match(ctx: ScanContext) {
    if (ctx.unknowns.length === 0) return null;
    const codeWord = ctx.unknowns.length === 1 ? "this code" : "these codes";
    return {
      label: `Associate ${codeWord} with product`,
      description: `Future scans will prompt for creation of new lots of this product.`,
      icon: PackagePlus,
      ready: true,
      priority: 30,
    };
  },
  Panel: CreateLotTypePanel,
};
