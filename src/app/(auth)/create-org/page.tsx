"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingOrg, setExistingOrg] = useState<{ slug: string } | null>(null);
  const [checkingOrgs, setCheckingOrgs] = useState(true);

  useEffect(() => {
    authClient.organization.list().then(({ data: orgs }) => {
      if (orgs && orgs.length > 0) {
        setExistingOrg({ slug: orgs[0]!.slug });
      }
      setCheckingOrgs(false);
    });
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  const slugValid = slug.length === 0 || SLUG_PATTERN.test(slug);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (!slug || !SLUG_PATTERN.test(slug)) {
      setError(
        "Slug must be URL-safe: lowercase letters, numbers, and hyphens only.",
      );
      return;
    }

    setLoading(true);

    const { data: org, error: createError } =
      await authClient.organization.create({
        name: name.trim(),
        slug,
      });

    if (createError) {
      setError(
        createError.message ??
          "Failed to create organization. Please try again.",
      );
      setLoading(false);
      return;
    }

    if (!org) {
      setError("Failed to create organization. Please try again.");
      setLoading(false);
      return;
    }

    await authClient.organization.setActive({ organizationId: org.id });
    router.push(`/${org.slug}/setup`);
    router.refresh();
  }

  if (checkingOrgs) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create your organization</CardTitle>
        <CardDescription>
          Set up a workspace for your team to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
            <Input
              id="org-name"
              type="text"
              placeholder="Acme Farms"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="org-slug">URL slug</FieldLabel>
            <Input
              id="org-slug"
              type="text"
              placeholder="acme-farms"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              data-invalid={!slugValid}
            />
            <FieldDescription>
              Your workspace will live at{" "}
              <span className="text-foreground font-medium">
                lineage.app/{slug || "your-slug"}
              </span>
            </FieldDescription>
            {!slugValid && (
              <FieldError>
                Slug must start and end with a letter or number, using only
                lowercase letters, numbers, and hyphens.
              </FieldError>
            )}
          </Field>

          {error && <FieldError>{error}</FieldError>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !slugValid}
          >
            {loading && <Loader2 className="animate-spin" />}
            Create organization
          </Button>

          {existingOrg && (
            <p className="text-muted-foreground text-center text-sm">
              You already have an organization.{" "}
              <Link
                href={`/${existingOrg.slug}`}
                className="text-foreground hover:text-primary underline underline-offset-4"
              >
                Go to {existingOrg.slug}
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
