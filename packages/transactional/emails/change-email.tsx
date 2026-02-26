import { Link, Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type ChangeEmailProps = {
  dashboardUrl: string;
  verifyUrl: string;
  newEmail: string;
};

export default function ChangeEmail({ dashboardUrl, verifyUrl, newEmail }: ChangeEmailProps) {
  return (
    <GuildersEmailLayout
      preview="Confirm your new email address"
      title="Confirm your new email"
      intro="We received a request to change the email on your Guilders account."
      ctaLabel="Confirm new email"
      ctaUrl={verifyUrl}
      dashboardUrl={dashboardUrl}
    >
      <Text style={styles.text}>
        Your new sign-in email will be <strong>{newEmail}</strong>.
      </Text>
      <Text style={styles.text}>If this was not you, do not click the button.</Text>
      <Text style={styles.text}>Manual link:</Text>
      <Link href={verifyUrl} style={styles.link}>
        {verifyUrl}
      </Link>
    </GuildersEmailLayout>
  );
}

ChangeEmail.PreviewProps = {
  dashboardUrl: "http://localhost:3002",
  verifyUrl: "http://localhost:3002/verify-email",
  newEmail: "john.doe@example.com",
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
