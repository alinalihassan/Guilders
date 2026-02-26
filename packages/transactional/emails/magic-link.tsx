import { Link, Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type MagicLinkEmailProps = {
  dashboardUrl: string;
  signInUrl: string;
};

export default function MagicLinkEmail({ dashboardUrl, signInUrl }: MagicLinkEmailProps) {
  return (
    <GuildersEmailLayout
      preview="Your secure sign-in link"
      title="Sign in to Guilders"
      intro="Use this one-time link to securely sign in to your Guilders account."
      ctaLabel="Sign in"
      ctaUrl={signInUrl}
      dashboardUrl={dashboardUrl}
    >
      <Text style={styles.text}>This link expires quickly and can only be used once.</Text>
      <Text style={styles.text}>Manual link:</Text>
      <Link href={signInUrl} style={styles.link}>
        {signInUrl}
      </Link>
    </GuildersEmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  dashboardUrl: "http://localhost:3002",
  signInUrl: "http://localhost:3002/sign-in",
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
