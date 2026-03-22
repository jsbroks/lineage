"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { api } from "~/trpc/react";

import {
  DEFAULT_LABEL_CONTENT,
  LABEL_TEMPLATES,
  loadSavedContent,
  loadSavedTemplate,
  saveContent,
  saveTemplate,
  type LabelContent,
  type LabelTemplate,
  type PrintItem,
} from "../_lib/templates";
import { ConfigPanel } from "./ConfigPanel";
import { LabelPreview } from "./LabelPreview";

interface PrintLabelsPageProps {
  org: string;
  initialTypeId?: string;
}

export const PrintLabelsPage: React.FC<PrintLabelsPageProps> = ({
  org,
  initialTypeId,
}) => {
  const [template, setTemplate] = useState<LabelTemplate>(() => {
    const savedId = loadSavedTemplate();
    return (
      (savedId && LABEL_TEMPLATES.find((t) => t.id === savedId)) ||
      LABEL_TEMPLATES[0]!
    );
  });

  const [content, setContent] = useState<LabelContent>(() => {
    return loadSavedContent() ?? DEFAULT_LABEL_CONTENT;
  });

  const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    saveTemplate(template.id);
  }, [template]);

  useEffect(() => {
    saveContent(content);
  }, [content]);

  const lotIdArray = useMemo(
    () => Array.from(selectedLotIds),
    [selectedLotIds],
  );

  const { data: printItems = [] } = api.lot.listForPrint.useQuery(
    { lotIds: lotIdArray },
    { enabled: lotIdArray.length > 0 },
  );

  const orderedItems: PrintItem[] = useMemo(() => {
    const map = new Map(printItems.map((p) => [p.id, p]));
    return lotIdArray
      .map((id) => map.get(id))
      .filter((p): p is PrintItem => !!p);
  }, [printItems, lotIdArray]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handlePrint = useCallback(() => {
    const style = document.getElementById("print-page-style");
    if (style) {
      const isThermal = template.category === "thermal";
      const pageW = isThermal ? template.labelWidth : template.pageWidth;
      const pageH = isThermal ? template.labelHeight : template.pageHeight;

      style.textContent = `
        @media print {
          @page {
            size: ${pageW}in ${pageH}in;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            padding: 0 !important;
            gap: 0 !important;
          }
          .print-page {
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
          }
          .print-label {
            border: none !important;
            box-shadow: none !important;
          }
          ${isThermal ? `.print-label { page-break-after: always; }` : ""}
        }
      `;
    }
    window.print();
  }, [template]);

  return (
    <>
      <style id="print-page-style" />
      <div className="flex h-full min-h-0 flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
        <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2 print:hidden">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${org}/inventory`}>Inventory</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Print Labels</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="relative min-h-0 flex-1 print:block">
          <div className="absolute inset-0 flex print:static print:inset-auto">
            <div className="shrink-0 print:hidden">
              <ConfigPanel
                selectedTemplate={template}
                onTemplateChange={setTemplate}
                content={content}
                onContentChange={setContent}
                selectedLotIds={selectedLotIds}
                onSelectedLotIdsChange={setSelectedLotIds}
                onPrint={handlePrint}
                initialTypeId={initialTypeId}
              />
            </div>

            <div className="bg-muted/30 flex-1 overflow-auto print:overflow-visible print:bg-white">
              <LabelPreview
                items={orderedItems}
                template={template}
                content={content}
                origin={origin}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
