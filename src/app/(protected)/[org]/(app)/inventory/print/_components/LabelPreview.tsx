"use client";

import React, { useMemo } from "react";

import type { LabelContent, LabelTemplate, PrintItem } from "../_lib/templates";
import { SingleLabel } from "./SingleLabel";

interface LabelPreviewProps {
  items: PrintItem[];
  template: LabelTemplate;
  content: LabelContent;
  origin: string;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({
  items,
  template,
  content,
  origin,
}) => {
  const labelsPerPage = template.columns * template.rows;
  const isThermal = template.category === "thermal";

  const pages = useMemo(() => {
    if (items.length === 0) return [];
    const result: PrintItem[][] = [];
    for (let i = 0; i < items.length; i += labelsPerPage) {
      result.push(items.slice(i, i + labelsPerPage));
    }
    return result;
  }, [items, labelsPerPage]);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select items to preview labels
        </p>
      </div>
    );
  }

  if (isThermal) {
    return (
      <div id="print-area" className="flex flex-col items-center gap-4 p-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="print-label border bg-white shadow-sm"
            style={{
              width: `${template.labelWidth}in`,
              height: `${template.labelHeight}in`,
            }}
          >
            <SingleLabel
              item={item}
              template={template}
              content={content}
              origin={origin}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id="print-area" className="flex flex-col items-center gap-6 p-6">
      {pages.map((pageItems, pageIdx) => (
        <div
          key={pageIdx}
          className="print-page relative border bg-white shadow-md"
          style={{
            width: `${template.pageWidth}in`,
            height: `${template.pageHeight}in`,
            paddingTop: `${template.marginTop}in`,
            paddingLeft: `${template.marginLeft}in`,
          }}
        >
          <div className="print-page-number text-muted-foreground absolute right-2 bottom-1 text-xs print:hidden">
            Page {pageIdx + 1} of {pages.length}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${template.columns}, ${template.labelWidth}in)`,
              gridTemplateRows: `repeat(${template.rows}, ${template.labelHeight}in)`,
              columnGap: `${template.gapX}in`,
              rowGap: `${template.gapY}in`,
            }}
          >
            {Array.from({ length: labelsPerPage }).map((_, slotIdx) => {
              const item = pageItems[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="print-label overflow-hidden border border-dashed border-gray-200 print:border-0"
                  style={{
                    width: `${template.labelWidth}in`,
                    height: `${template.labelHeight}in`,
                  }}
                >
                  {item ? (
                    <SingleLabel
                      item={item}
                      template={template}
                      content={content}
                      origin={origin}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
