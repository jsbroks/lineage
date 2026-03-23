import * as React from "react";
import { render } from "@react-email/components";

import { env } from "~/env";
import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({ region: "us-east-1" });
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  const html = await render(react);

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (info.rejected.length > 0) {
    console.error("[email] Failed to send:", info.rejected);
    throw new Error(`Failed to send email: ${info.rejected[0]}`);
  }

  return info;
}
