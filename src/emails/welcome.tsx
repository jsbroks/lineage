import { Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout, Heading, Paragraph, PrimaryButton } from "./_components";

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export default function WelcomeEmail({
  name = "there",
  loginUrl = "https://lineage.farm/login",
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to Lineage — your account is ready">
      <Heading>Welcome to Lineage</Heading>
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Your email has been verified and your account is ready to go. Lineage
        helps you track inventory across your entire production pipeline — from
        raw materials to finished goods.
      </Paragraph>
      <Paragraph>Here&apos;s what you can do next:</Paragraph>
      <Paragraph>
        <strong>1. Create your organization</strong> — set up your workspace and
        choose your industry vertical.
        <br />
        <strong>2. Define your products</strong> — set up the things you produce
        and track.
        <br />
        <strong>3. Invite your team</strong> — collaborate with the people who
        handle your inventory.
        <br />
        <strong>4. Scan &amp; track</strong> — use barcode scanning to record
        operations in real time.
      </Paragraph>
      <Section className="my-8 text-center">
        <PrimaryButton href={loginUrl}>Go to Lineage</PrimaryButton>
      </Section>
      <Paragraph muted>
        Have questions? Reply to this email and we&apos;ll help you get set up.
      </Paragraph>
    </EmailLayout>
  );
}
