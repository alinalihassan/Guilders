import { Link, Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type VerifyEmailProps = {
  dashboardUrl: string;
  verifyUrl: string;
};

export default function VerifyEmail({ dashboardUrl, verifyUrl }: VerifyEmailProps) {
  return (
    <GuildersEmailLayout
      preview="Verify your email address"
      title="Confirm your email"
      intro="Please confirm your email address to secure your Guilders account and complete setup."
      ctaLabel="Confirm email"
      ctaUrl={verifyUrl}
      dashboardUrl={dashboardUrl}
    >
      <Text style={styles.text}>
        If you did not create a Guilders account, you can ignore this message.
      </Text>
      <Text style={styles.text}>Manual link:</Text>
      <Link href={verifyUrl} style={styles.link}>
        {verifyUrl}
      </Link>
    </GuildersEmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  dashboardUrl: "http://localhost:3002",
  verifyUrl: "http://localhost:3002/verify-email",
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
