"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";

import { DetailsTab } from "./DetailsTab";
import { VariantsTab } from "./VariantsTab";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";
import { useForm, FormProvider } from "react-hook-form";

export type DetailsFormValues = {
  name: string;
  description: string;
  codePrefix: string;
  icon: string;
  color: string;
  categoryId: string;
  defaultStatus: string;
  hasVariants: boolean;
  itemTypes: { buy: boolean; make: boolean; sell: boolean };
  trackingType: "standard" | "serialized";
  qtyUom: string;
  defaultLocation: string;
  weightPerUnit: string;
  weightUnit: string;
  defaultUnitPrice: string;
  defaultPurchasePrice: string;
  minimumStockLevel: string;
};

const detailsDefaults: DetailsFormValues = {
  name: "",
  description: "",
  codePrefix: "",
  icon: "",
  color: "",
  categoryId: "",
  defaultStatus: "",
  hasVariants: false,
  itemTypes: { buy: false, make: false, sell: false },
  trackingType: "serialized",
  qtyUom: "",
  defaultLocation: "",
  weightPerUnit: "",
  weightUnit: "g",
  defaultUnitPrice: "",
  defaultPurchasePrice: "",
  minimumStockLevel: "",
};

const useDialog = () => {
  const [productId, setProductId] = useQueryState("product");
  const open = productId != null && productId !== "";
  return { open, productId, close: () => setProductId(null) };
};

export function LotTypeDialog() {
  const { open, productId, close } = useDialog();
  const [tab, setTab] = useQueryState("tab", { defaultValue: "details" });

  const product = api.lotType.getById.useQuery(
    { id: productId ?? "" },
    { enabled: productId != null && productId !== "" },
  );

  const onOpenChange = (_: boolean) => {
    setTab(null);
    close();
  };

  const editMutation = api.lotType.edit.useMutation();
  const utils = api.useUtils();

  const form = useForm<DetailsFormValues>({ defaultValues: detailsDefaults });

  useEffect(() => {
    if (!product.data?.lotType) return;
    const lt = product.data.lotType;
    form.reset({
      ...detailsDefaults,
      name: lt.name ?? "",
      description: lt.description ?? "",
      codePrefix: lt.codePrefix ?? "",
      icon: lt.icon ?? "",
      color: lt.color ?? "",
      categoryId: lt.categoryId ?? "",
      qtyUom: lt.qtyUom ?? "",
      hasVariants: (product.data.options?.length ?? 0) > 0,
    });
  }, [product.data, form]);

  const onSave = form.handleSubmit(async (values) => {
    if (!productId) return;
    await editMutation.mutateAsync({
      id: productId,
      name: values.name,
      description: values.description || null,
      icon: values.icon || null,
      color: values.color || null,
      categoryId: values.categoryId || null,
      quantityDefaultUnit: values.qtyUom || undefined,
      codePrefix: values.codePrefix || null,
    });
    await utils.lotType.getById.invalidate({ id: productId });
    await utils.lotType.list.invalidate();
    await utils.lotType.inventoryOverview.invalidate();
  });

  const { name, icon } = product.data?.lotType ?? {};

  return (
    <FormProvider {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="top-8 flex max-h-[calc(100vh-4rem)]! translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Icon icon={icon} className="size-4" />
              {name}
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="mt-4 shrink-0 border-b px-6">
              <TabsList variant="line">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="overflow-y-auto py-6">
              <DetailsTab />
            </TabsContent>

            <TabsContent value="variants" className="overflow-y-auto p-6">
              <VariantsTab />
            </TabsContent>

            <TabsContent
              value="inventory"
              className="space-y-6 overflow-y-auto px-6 pt-4 pb-6"
            />

            <TabsContent
              value="purchasing"
              className="overflow-y-auto px-6 pt-4 pb-6"
            >
              <div className="text-muted-foreground py-12 text-center text-sm">
                Purchasing configuration coming soon.
              </div>
            </TabsContent>

            <TabsContent
              value="history"
              className="overflow-y-auto px-6 pt-4 pb-6"
            >
              <div className="text-muted-foreground py-12 text-center text-sm">
                Change history coming soon.
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="bg-background shrink-0 border-t px-6 py-4">
            <Button onClick={onSave} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
