"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { Icon } from "~/app/_components/IconPicker";

export default function TasksPage() {
  const params = useParams<{ org: string }>();
  const { data: operationTypes = [], isLoading } =
    api.operationType.list.useQuery();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Activities</h1>
        </div>
        <Button size="sm" asChild>
          <Link href={`/${params.org}/tasks/new`}>
            <Plus className="mr-1 size-3.5" /> New activity
          </Link>
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-muted-foreground px-6 py-12 text-center text-sm">
            Loading activities...
          </div>
        ) : operationTypes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No activities configured yet.
            </p>
            <Button size="sm" asChild>
              <Link href={`/${params.org}/tasks/new`}>
                <Plus className="mr-1 size-3.5" /> Create your first activity
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {operationTypes.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded">
                        <Icon icon={op.icon} className="size-4" />
                      </div>
                      <Link
                        href={`/${params.org}/tasks/${op.id}/edit`}
                        className="hover:text-primary font-medium underline-offset-4 hover:underline"
                      >
                        {op.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {op.description || "–"}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${params.org}/tasks/${op.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
