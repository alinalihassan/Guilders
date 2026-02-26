import { Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type WelcomeEmailProps = {
  dashboardUrl: string;
  userName?: string;
};

export default function WelcomeEmail({ dashboardUrl, userName }: WelcomeEmailProps) {
  return (
    <GuildersEmailLayout
      preview="Welcome to Guilders"
      title={`Welcome to Guilders, ${userName}`}
      intro="Your account is ready. Start by linking an account or adding your first manual account to track your net worth in one place."
      ctaLabel="Open Guilders"
      ctaUrl={dashboardUrl}
      dashboardUrl={dashboardUrl}
      outro="You are receiving this email because a Guilders account was created with this address."
    >
      <Text style={styles.text}>
        Guilders helps you see your full financial picture across cash, investments, liabilities,
        and recurring transactions.
      </Text>
    </GuildersEmailLayout>
  );
}

const styles = {
  text: {
    color: "#2e3b36",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
};

WelcomeEmail.PreviewProps = {
  userName: "John Doe",
  dashboardUrl: "http://localhost:3002",
};
