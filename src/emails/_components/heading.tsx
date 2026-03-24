import { Heading as H } from "@react-email/components";
import * as React from "react";

interface HeadingProps {
  children: React.ReactNode;
}

export function Heading({ children }: HeadingProps) {
  return (
    <H as="h2" className="text-brand mt-0 mb-4 text-xl font-semibold">
      {children}
    </H>
  );
}
