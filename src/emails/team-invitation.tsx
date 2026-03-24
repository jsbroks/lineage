import { Section, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout, Heading, Paragraph, PrimaryButton } from "./_components";

interface TeamInvitationEmailProps {
  inviterName: string;
  organizationName: string;
  invitationLink: string;
}

export default function TeamInvitationEmail({
  inviterName = "A teammate",
  organizationName = "Your Organization",
  invitationLink = "https://lineage.farm/invite",
}: TeamInvitationEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${organizationName} on Lineage`}
    >
      <Heading>You&apos;re invited</Heading>
      <Paragraph>
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{organizationName}</strong> on Lineage.
      </Paragraph>
      <Paragraph>
        Lineage helps teams track inventory from raw materials through finished
        goods. Accept the invitation below to get started with your team.
      </Paragraph>
      <Section className="my-8 text-center">
        <PrimaryButton href={invitationLink}>Accept Invitation</PrimaryButton>
      </Section>
      <Paragraph muted>
        If the button above doesn&apos;t work, copy and paste this link into
        your browser:{" "}
        <Link href={invitationLink} className="text-muted break-all underline">
          {invitationLink}
        </Link>
      </Paragraph>
      <Paragraph muted>
        If you weren&apos;t expecting this invitation, you can safely ignore
        this email.
      </Paragraph>
    </EmailLayout>
  );
}
