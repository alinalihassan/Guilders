import { Section, Text } from "@react-email/components";

import { GuildersEmailLayout } from "../components/guilders-email-layout";

type TwoFactorCodeEmailProps = {
  dashboardUrl: string;
  code: string;
};

export default function TwoFactorCodeEmail({ dashboardUrl, code }: TwoFactorCodeEmailProps) {
  return (
    <GuildersEmailLayout
      preview={`Your Guilders verification code: ${code}`}
      title="Your verification code"
      intro="Use the code below to complete your Guilders sign in."
      outro="If you did not try to sign in, change your password and review your account activity."
      dashboardUrl={dashboardUrl}
    >
      <Section style={styles.codeWrap}>
        <Text style={styles.code}>{code}</Text>
      </Section>
      <Text style={styles.text}>This code expires in 10 minutes.</Text>
    </GuildersEmailLayout>
  );
}

TwoFactorCodeEmail.PreviewProps = {
  dashboardUrl: "http://localhost:3002",
  code: "123456",
};

const styles = {
  codeWrap: {
    backgroundColor: "#f3f4ef",
    border: "1px solid #e8e5dc",
    borderRadius: "12px",
    marginBottom: "16px",
    marginTop: "8px",
    padding: "16px",
    textAlign: "center" as const,
  },
  code: {
    color: "#193029",
    fontSize: "34px",
    fontWeight: "700",
    letterSpacing: "10px",
    lineHeight: "1.2",
    margin: 0,
  },
  text: {
    color: "#2e3b36",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 10px",
  },
};
