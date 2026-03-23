"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  FolderTree,
  MapPin,
  Pencil,
  Plus,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { IconPicker, Icon } from "~/app/_components/IconPicker";
import {
  ColorSelector,
  getColorClasses,
} from "~/app/_components/ColorSelector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LocationRow = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  typeId: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LocationTypeRow = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TreeNode = LocationRow & { children: TreeNode[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTree(locations: LocationRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const loc of locations) {
    map.set(loc.id, { ...loc, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ---------------------------------------------------------------------------
// Location Type Sheet (manage types)
// ---------------------------------------------------------------------------

function LocationTypeRow({
  lt,
  locationCount,
}: {
  lt: LocationTypeRow;
  locationCount: number;
}) {
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(lt.name);
  const [description, setDescription] = useState(lt.description ?? "");
  const [icon, setIcon] = useState(lt.icon ?? "");
  const [color, setColor] = useState(lt.color ?? "");

  const editMutation = api.location.editType.useMutation({
    onSuccess: () => {
      void utils.location.listTypes.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = api.location.deleteType.useMutation({
    onSuccess: () => void utils.location.listTypes.invalidate(),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    editMutation.mutate({
      id: lt.id,
      name: name.trim(),
      description: description.trim() || null,
      icon: icon || null,
      color: color || null,
    });
  };

  const handleCancel = () => {
    setName(lt.name);
    setDescription(lt.description ?? "");
    setIcon(lt.icon ?? "");
    setColor(lt.color ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type name"
          autoFocus
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <div className="grid grid-cols-2 gap-2">
          <IconPicker value={icon} onValueChange={setIcon}>
            <SelectValue placeholder="Icon" />
          </IconPicker>
          <ColorSelector value={color} onValueChange={setColor}>
            <SelectValue placeholder="Color" />
          </ColorSelector>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={editMutation.isPending || !name.trim()}
          >
            <Check className="mr-1 size-3" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const colorCls = lt.color ? getColorClasses(lt.color) : null;

  return (
    <div className="group/type flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50">
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded",
          colorCls ? colorCls.bg : "bg-muted",
          colorCls ? colorCls.text : "text-muted-foreground",
        )}
      >
        {lt.icon ? (
          <Icon icon={lt.icon} className="size-4" />
        ) : (
          <Tag className="size-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{lt.name}</p>
        {lt.description && (
          <p className="text-muted-foreground truncate text-xs">
            {lt.description}
          </p>
        )}
      </div>
      {locationCount > 0 && (
        <span className="text-muted-foreground text-xs tabular-nums">
          {locationCount}
        </span>
      )}
      <div className="flex gap-1 opacity-0 transition-opacity group-hover/type:opacity-100">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
          onClick={() => deleteMutation.mutate({ id: lt.id })}
          disabled={deleteMutation.isPending}
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function LocationTypesSheet({
  open,
  onOpenChange,
  locationTypes,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationTypes: LocationTypeRow[];
  locations: LocationRow[];
}) {
  const utils = api.useUtils();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newColor, setNewColor] = useState("");

  const createMutation = api.location.createType.useMutation({
    onSuccess: () => {
      void utils.location.listTypes.invalidate();
      setNewName("");
      setNewDesc("");
      setNewIcon("");
      setNewColor("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      description: newDesc.trim() || null,
      icon: newIcon || null,
      color: newColor || null,
    });
  };

  const countByType = useMemo(() => {
    const m = new Map<string, number>();
    for (const loc of locations) {
      if (loc.typeId) m.set(loc.typeId, (m.get(loc.typeId) ?? 0) + 1);
    }
    return m;
  }, [locations]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Location Types</SheetTitle>
          <SheetDescription>
            Define what kinds of locations you use — rooms, shelves, dollies,
            zones, or anything else that holds inventory.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 pb-4">
          {locationTypes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No types defined yet. Add one below.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {locationTypes.map((lt) => (
                <LocationTypeRow
                  key={lt.id}
                  lt={lt}
                  locationCount={countByType.get(lt.id) ?? 0}
                />
              ))}
            </div>
          )}

          <Separator />

          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <p className="text-sm font-medium">Add type</p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='e.g. "Room", "Shelf", "Dolly"'
            />
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="grid grid-cols-2 gap-2">
              <IconPicker value={newIcon} onValueChange={setNewIcon}>
                <SelectValue placeholder="Icon" />
              </IconPicker>
              <ColorSelector value={newColor} onValueChange={setNewColor}>
                <SelectValue placeholder="Color" />
              </ColorSelector>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !newName.trim()}
            >
              {createMutation.isPending ? "Adding..." : "Add type"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit Location Dialog
// ---------------------------------------------------------------------------

type LocationFormState = {
  name: string;
  description: string;
  typeId: string;
  parentId: string;
};

const EMPTY_FORM: LocationFormState = {
  name: "",
  description: "",
  typeId: "",
  parentId: "",
};

function formFromLocation(loc: LocationRow): LocationFormState {
  return {
    name: loc.name,
    description: loc.description ?? "",
    typeId: loc.typeId ?? "",
    parentId: loc.parentId ?? "",
  };
}

function LocationDialog({
  open,
  onOpenChange,
  locations,
  locationTypes,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationRow[];
  locationTypes: LocationTypeRow[];
  editing?: LocationRow | null;
}) {
  const utils = api.useUtils();
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);
  const isEditing = !!editing;

  useEffect(() => {
    if (open && editing) {
      setForm(formFromLocation(editing));
    } else if (!open) {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    onOpenChange(false);
  };

  const createMutation = api.location.create.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      resetAndClose();
    },
  });

  const editMutation = api.location.edit.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      resetAndClose();
    },
  });

  const deleteMutation = api.location.delete.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      resetAndClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      typeId: form.typeId || null,
      parentId: form.parentId || null,
    };
    if (isEditing) {
      await editMutation.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const isSaving = createMutation.isPending || editMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit location" : "New location"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this location's details."
              : "Add a new location to your organization. A location can be anything that holds or groups inventory — a room, shelf, vehicle, zone, etc."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-name">Name</Label>
            <Input
              id="loc-name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              required
              placeholder="e.g. Grow Room A, Shelf B3, Delivery Van"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-type">Type</Label>
              <Select
                value={form.typeId}
                onValueChange={(val) =>
                  setForm((p) => ({ ...p, typeId: val }))
                }
              >
                <SelectTrigger id="loc-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {locationTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="loc-parent">Parent</Label>
              <Select
                value={form.parentId}
                onValueChange={(val) =>
                  setForm((p) => ({ ...p, parentId: val }))
                }
              >
                <SelectTrigger id="loc-parent">
                  <SelectValue placeholder="None (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {locations
                      .filter((l) => l.id !== editing?.id)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="loc-desc">Description</Label>
            <textarea
              id="loc-desc"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Optional description"
            />
          </div>

          <DialogFooter>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 mr-auto"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: editing.id })}
              >
                <Trash2 className="mr-1 size-3.5" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tree Node
// ---------------------------------------------------------------------------

type LocationTypeInfo = {
  name: string;
  icon: string | null;
  color: string | null;
};

function TreeItem({
  node,
  depth,
  org,
  locationTypes,
  onEdit,
}: {
  node: TreeNode;
  depth: number;
  org: string;
  locationTypes: Map<string, LocationTypeInfo>;
  onEdit: (loc: LocationRow) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const typeInfo = node.typeId ? locationTypes.get(node.typeId) : null;
  const colorCls = typeInfo?.color ? getColorClasses(typeInfo.color) : null;

  return (
    <div>
      <div
        className="group/tree-item hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        style={{ paddingLeft: depth * 20 + 8 }}
      >
        <button
          type="button"
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded transition-colors",
            hasChildren
              ? "hover:bg-muted text-muted-foreground"
              : "invisible",
          )}
          onClick={() => setExpanded((e) => !e)}
          tabIndex={hasChildren ? 0 : -1}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>

        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded",
            colorCls ? colorCls.bg : "bg-muted",
            colorCls ? colorCls.text : "text-muted-foreground",
          )}
        >
          {typeInfo?.icon ? (
            <Icon icon={typeInfo.icon} className="size-3.5" />
          ) : (
            <MapPin className="size-3.5" />
          )}
        </div>

        <Link
          href={`/${org}/settings/locations/${node.id}`}
          className="hover:text-primary flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
        >
          {node.name}
        </Link>

        {typeInfo && (
          <Badge variant="secondary" className="text-[10px]">
            {typeInfo.name}
          </Badge>
        )}

        {hasChildren && (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {node.children.length}
          </span>
        )}

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/tree-item:opacity-100"
          title="Edit"
          onClick={() => onEdit(node)}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              org={org}
              locationTypes={locationTypes}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LocationsSettingsPage() {
  const params = useParams<{ org: string }>();
  const { data: locations = [], isLoading } = api.location.list.useQuery();
  const { data: locationTypesRaw = [] } = api.location.listTypes.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(
    null,
  );
  const [typesOpen, setTypesOpen] = useState(false);

  const openCreate = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditingLocation(loc);
    setDialogOpen(true);
  };

  const tree = useMemo(() => buildTree(locations), [locations]);

  const locationTypeMap = useMemo(
    () =>
      new Map(
        locationTypesRaw.map((t) => [
          t.id,
          { name: t.name, icon: t.icon, color: t.color },
        ]),
      ),
    [locationTypesRaw],
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Locations</h1>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTypesOpen(true)}
          >
            <Settings2 className="mr-1 size-3.5" />
            Manage types
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 size-3.5" /> New location
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col gap-2 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FolderTree className="text-muted-foreground size-10" />
            <div>
              <p className="text-sm font-medium">No locations yet</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Locations represent the physical places that hold your
                inventory — rooms, shelves, vehicles, zones, or anything else.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTypesOpen(true)}
              >
                <Settings2 className="mr-1 size-3.5" /> Set up types first
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1 size-3.5" /> Create location
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            {tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                org={params.org}
                locationTypes={locationTypeMap}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        locations={locations}
        locationTypes={locationTypesRaw}
        editing={editingLocation}
      />

      <LocationTypesSheet
        open={typesOpen}
        onOpenChange={setTypesOpen}
        locationTypes={locationTypesRaw}
        locations={locations}
      />
    </div>
  );
}
