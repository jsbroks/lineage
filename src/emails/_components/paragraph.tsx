import { Text } from "@react-email/components";
import * as React from "react";

interface ParagraphProps {
  children: React.ReactNode;
  muted?: boolean;
}

export function Paragraph({ children, muted }: ParagraphProps) {
  return (
    <Text
      className={`my-4 text-sm leading-6 ${muted ? "text-muted" : "text-brand"}`}
    >
      {children}
    </Text>
  );
}
