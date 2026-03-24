import { Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout, Heading, Paragraph, PrimaryButton } from "./_components";

interface PasswordResetEmailProps {
  name: string;
  url: string;
}

export default function PasswordResetEmail({
  name = "there",
  url = "https://lineage.farm/reset-password",
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your Lineage password">
      <Heading>Reset your password</Heading>
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        We received a request to reset the password for your Lineage account.
        Click the button below to choose a new one.
      </Paragraph>
      <Section className="my-8 text-center">
        <PrimaryButton href={url}>Reset Password</PrimaryButton>
      </Section>
      <Paragraph muted>
        If the button above doesn&apos;t work, copy and paste this link into
        your browser:{" "}
        <Link href={url} className="text-muted break-all underline">
          {url}
        </Link>
      </Paragraph>
      <Paragraph muted>
        If you didn&apos;t request a password reset, you can safely ignore this
        email. Your password will remain unchanged.
      </Paragraph>
    </EmailLayout>
  );
}
