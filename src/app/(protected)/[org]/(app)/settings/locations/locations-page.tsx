"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

type LocationFormState = {
  name: string;
  type: string;
  description: string;
  parentId: string;
};

const EMPTY_FORM: LocationFormState = {
  name: "",
  type: "",
  description: "",
  parentId: "",
};

export default function LocationsSettingsPage() {
  const utils = api.useUtils();
  const { data: locations = [], isLoading } = api.location.list.useQuery();

  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);

  const createMutation = api.location.create.useMutation({
    onSuccess: async () => {
      await utils.location.list.invalidate();
      setForm(EMPTY_FORM);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createMutation.mutateAsync({
      name: form.name.trim(),
      type: form.type.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId || null,
    });
  };

  const isSaving = createMutation.isPending;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create and manage locations used for operations and inventory.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Existing locations</CardTitle>
            <CardDescription>Current location records.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading locations...
              </p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No locations yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => {
                  const parent = loc.parentId
                    ? locations.find(
                        (candidate) => candidate.id === loc.parentId,
                      )
                    : null;

                  return (
                    <div
                      key={loc.id}
                      className="border-border rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{loc.name}</p>
                        <span className="text-muted-foreground text-xs uppercase">
                          {loc.type}
                        </span>
                      </div>
                      {loc.description && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {loc.description}
                        </p>
                      )}
                      {parent && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Parent: {parent.name}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create location</CardTitle>
            <CardDescription>
              Add a new location. Optionally nest it under an existing parent
              location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="Grow Room A"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Type</span>
                  <input
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                    required
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                    placeholder="grow_room"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
                  placeholder="Optional description"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span>Parent location</span>
                <select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                  className="border-input bg-background w-full rounded-md border px-3 py-2"
                >
                  <option value="">None</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Create location"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
