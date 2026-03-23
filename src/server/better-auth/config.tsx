import { env } from "~/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  organization,
  lastLoginMethod,
  testUtils,
} from "better-auth/plugins";
import type { BetterAuthPlugin } from "better-auth";

import { db } from "~/server/db";
import { sendEmail } from "~/server/email";
import VerificationEmail from "~/emails/verification";
import PasswordResetEmail from "~/emails/password-reset";
import TeamInvitationEmail from "~/emails/team-invitation";
import WelcomeEmail from "~/emails/welcome";

const plugins: BetterAuthPlugin[] = [
  admin(),
  organization({
    sendInvitationEmail: async (data) => {
      const { email, organization, invitation } = data;
      const invitationLink = `${env.BETTER_AUTH_URL}/invitations/${invitation.id}`;

      await sendEmail({
        to: email,
        subject: `You've been invited to join ${organization.name} on Lineage`,
        react: (
          <TeamInvitationEmail
            inviterName={data.inviter.user.name}
            organizationName={data.organization.name}
            invitationLink={invitationLink}
          />
        ),
      });
    },
  }),
  lastLoginMethod(),
];

if (process.env.NODE_ENV !== "production") {
  plugins.push(testUtils());
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Lineage password",
        react: <PasswordResetEmail name={user.name} url={url} />,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Lineage email",
        react: <VerificationEmail name={user.name} url={url} />,
      });
    },
    async afterEmailVerification(user) {
      const loginUrl = `${env.BETTER_AUTH_URL}/login`;
      await sendEmail({
        to: user.email,
        subject: "Welcome to Lineage",
        react: <WelcomeEmail name={user.name} loginUrl={loginUrl} />,
      });
    },
  },

  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
