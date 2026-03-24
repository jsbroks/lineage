import { Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout, Heading, Paragraph, PrimaryButton } from "./_components";

interface VerificationEmailProps {
  name: string;
  url: string;
}

export default function VerificationEmail({
  name = "there",
  url = "https://lineage.farm/verify",
}: VerificationEmailProps) {
  return (
    <EmailLayout preview="Verify your email address to get started with Lineage">
      <Heading>Verify your email</Heading>
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Thanks for signing up for Lineage. Please verify your email address so
        we can confirm it&apos;s really you.
      </Paragraph>
      <Section className="my-8 text-center">
        <PrimaryButton href={url}>Verify Email Address</PrimaryButton>
      </Section>
      <Paragraph muted>
        If the button above doesn&apos;t work, copy and paste this link into
        your browser:{" "}
        <Link href={url} className="text-muted break-all underline">
          {url}
        </Link>
      </Paragraph>
      <Paragraph muted>
        If you didn&apos;t create a Lineage account, you can safely ignore this
        email.
      </Paragraph>
    </EmailLayout>
  );
}
