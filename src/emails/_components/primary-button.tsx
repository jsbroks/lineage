import { Button } from "@react-email/components";
import * as React from "react";

interface PrimaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export function PrimaryButton({ href, children }: PrimaryButtonProps) {
  return (
    <Button
      href={href}
      className="bg-brand inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white no-underline"
    >
      {children}
    </Button>
  );
}
