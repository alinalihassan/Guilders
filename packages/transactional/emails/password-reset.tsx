import { Link, Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type PasswordResetEmailProps = {
  dashboardUrl: string;
  userEmail: string;
  resetUrl: string;
};

export default function PasswordResetEmail({
  dashboardUrl,
  userEmail,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <GuildersEmailLayout
      preview="Reset your Guilders password"
      title="Reset your password"
      intro="A request was made to reset your Guilders password. Use the button below to choose a new password."
      ctaLabel="Reset password"
      ctaUrl={resetUrl}
      dashboardUrl={dashboardUrl}
    >
      <Text style={styles.text}>Request received for {userEmail}.</Text>
      <Text style={styles.text}>
        If the button does not work, copy and paste this link into your browser:
      </Text>
      <Link href={resetUrl} style={styles.link}>
        {resetUrl}
      </Link>
      <Text style={styles.text}>This link expires shortly for security reasons.</Text>
    </GuildersEmailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  dashboardUrl: "http://localhost:3002",
  userEmail: "john.doe@example.com",
  resetUrl: "http://localhost:3002/reset-password",
};

const styles = {
  text: {
    color: "#2e3b36",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 10px",
  },
  link: {
    color: "#193029",
    display: "block",
    fontSize: "13px",
    lineHeight: "1.6",
    marginBottom: "12px",
    wordBreak: "break-all" as const,
  },
};
