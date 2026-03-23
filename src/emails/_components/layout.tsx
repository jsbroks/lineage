import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Font,
  Hr,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import * as React from "react";

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: "#18181b",
        muted: "#71717a",
        "muted-light": "#a1a1aa",
        border: "#e4e4e7",
        surface: "#fafafa",
      },
    },
  },
} as const;

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90OhOg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90OhOg.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="mx-auto my-0 bg-white font-sans">
          <Container className="mx-auto max-w-[560px] px-6 py-10">
            <Section>
              <Text className="text-brand mb-8 text-lg font-semibold tracking-tight">
                Lineage
              </Text>
            </Section>
            {children}
            <Hr className="border-border my-8" />
            <Section>
              <Text className="text-muted-light text-xs leading-5">
                Lineage &mdash; Inventory tracking for producers.
                <br />
                <Link
                  href="https://lineage.farm"
                  className="text-muted-light underline"
                >
                  lineage.farm
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
