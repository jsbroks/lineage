"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

import { CreditCard, Factory, Info, Tag } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";

interface LotTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string;
}

export function LotTypeDialog({
  open,
  onOpenChange,
  name,
}: LotTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-12 flex max-h-[calc(100vh-4rem)]! translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{name ?? "Product Settings"}</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="details"
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
            <div className="mx-auto w-xl space-y-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lt-name" className="text-sm">
                    Name
                  </Label>
                  <Input id="lt-name" required placeholder="Fruiting Block" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lt-description">Description</Label>
                <Textarea
                  id="lt-description"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lt-name" className="text-sm">
                    SKU
                  </Label>
                  <Input id="lt-name" required placeholder="Fruiting Block" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>General</Label>
                <Card className="rounded-md">
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <label>Category</label>
                      <input
                        className="max-w-32 text-right outline-none"
                        placeholder="Select category"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label>Default Status</label>
                      <input
                        className="max-w-32 text-right outline-none"
                        placeholder="Active"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label className="flex items-center gap-2">
                        This item has variants{" "}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-48">
                              Define variants to create different versions of
                              the item. For example, a product with different
                              species, colors, or sizes.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="space-y-2">
                  <Label>
                    Item Type{" "}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-48">
                          Select all that apply.
                          <br />
                          <br />
                          Buy: The item is purchased from a supplier.
                          <br />
                          <br />
                          Make: The item is produced in-house.
                          <br />
                          <br />
                          Sell: The item is sold to customers.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="grid gap-4 text-center md:grid-cols-3">
                    <div className="relative flex flex-col items-center space-y-4 rounded-md border p-0 pt-5">
                      <CreditCard className="text-muted-foreground/60 size-10" />
                      <label>Buy</label>
                      <div className="absolute top-0 right-0 p-2">
                        <Checkbox />
                      </div>
                    </div>
                    <div className="relative flex flex-col items-center space-y-4 rounded-md border p-0 pt-5">
                      <Factory className="text-muted-foreground/60 size-10" />
                      <label>Make</label>
                      <div className="absolute top-0 right-0 p-2">
                        <Checkbox />
                      </div>
                    </div>
                    <div className="relative flex flex-col items-center space-y-4 rounded-md border pt-5">
                      <Tag className="text-muted-foreground/60 size-10" />
                      <label>Sell</label>
                      <div className="absolute top-0 right-0 p-2">
                        <Checkbox />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Inventory</Label>
                <Card>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <label>Default stock Unit of Measurement (UOM)</label>
                      <select
                        className="max-w-48 text-right outline-none"
                        required
                      >
                        <option value="" disabled>
                          Set UoM
                        </option>
                        <option value="bags">Bags (bags)</option>
                        <option value="bbls">Barrels (bbls)</option>
                        <option value="cs">Cases (cs)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="ea">Each (ea)</option>
                        <option value="ft">Feet (ft)</option>
                        <option value="fl oz">Fluid Ounces (fl oz)</option>
                        <option value="gal">Gallons (gal)</option>
                        <option value="g">Grams (g)</option>
                        <option value="gross">Gross (gross)</option>
                        <option value="h">Hundred Count (h)</option>
                        <option value="in">Inches (in)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="L">Liters (L)</option>
                        <option value="m">Meters (m)</option>
                        <option value="µg">Micrograms (µg)</option>
                        <option value="µL">Microliters (µL)</option>
                        <option value="µM">Micromolar (µM)</option>
                        <option value="µmol">Micromoles (µmol)</option>
                        <option value="mg">Milligrams (mg)</option>
                        <option value="mL">Milliliters (mL)</option>
                        <option value="mm">Millimeters (mm)</option>
                        <option value="mM">Millimolar (mM)</option>
                        <option value="mmol">Millimoles (mmol)</option>
                        <option value="ng">Nanograms (ng)</option>
                        <option value="nL">Nanoliters (nL)</option>
                        <option value="nM">Nanomolar (nM)</option>
                        <option value="nmol">Nanomoles (nmol)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="pairs">Pairs (pairs)</option>
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="lb">Pounds (lb)</option>
                        <option value="sets">Sets (sets)</option>
                        <option value="cm²">Square Centimeters (cm²)</option>
                        <option value="ft²">Square Feet (ft²)</option>
                        <option value="in²">Square Inches (in²)</option>
                        <option value="m²">Square Meters (m²)</option>
                        <option value="k">Thousand Count (k)</option>
                        <option value="ozt">Troy Ounces (ozt)</option>
                        <option value="yd">Yards (yd)</option>
                      </select>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label>Default location</label>
                      <input
                        className="max-w-32 text-right outline-none"
                        placeholder="Select location"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label className="grow">Weight per unit</label>
                      <div className="text-muted-foreground">uL =</div>
                      <input
                        className="max-w-15 text-right outline-none"
                        placeholder="0"
                      />

                      <select className="text-muted-foreground ml-1 w-10 text-right outline-none">
                        <option value="mg">mg</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="oz">oz</option>
                        <option value="lb">lb</option>
                        <option value="ton">ton</option>
                        <option value="tonne">tonne</option>
                      </select>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label>Default Unit Price</label>
                      <input
                        className="max-w-16 text-right outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    <Separator />
                    <div className="flex justify-between">
                      <label>Default Purchase Price</label>
                      <input
                        className="max-w-16 text-right outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <label>Minimum stock level</label>
                      <input
                        className="max-w-16 text-right outline-none"
                        placeholder="0"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="overflow-y-auto p-6">
            <div className="mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button variant="secondary">Edit Options</Button>
              </div>
              <div></div>
            </div>
          </TabsContent>

          <TabsContent
            value="inventory"
            className="space-y-6 overflow-y-auto px-6 pt-4 pb-6"
          ></TabsContent>

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
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
