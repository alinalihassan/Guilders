import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { JSX } from "react";

type GuildersEmailLayoutProps = {
  preview: string;
  title: string;
  intro: string;
  ctaLabel?: string;
  ctaUrl?: string;
  children?: JSX.Element | JSX.Element[] | string | undefined | null;
  dashboardUrl: string;
  outro?: string;
};

export function GuildersEmailLayout({
  preview,
  title,
  intro,
  ctaLabel,
  ctaUrl,
  children,
  dashboardUrl,
  outro = "If you did not request this, you can safely ignore this email.",
}: GuildersEmailLayoutProps) {
  const logoUrl = `${dashboardUrl}/assets/logo/logo_filled_rounded.png`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brandSection}>
            <Link href={dashboardUrl}>
              <Img src={logoUrl} alt="Guilders" width="48" height="48" />
            </Link>
          </Section>

          <Heading style={styles.title}>{title}</Heading>
          <Text style={styles.text}>{intro}</Text>

          {ctaLabel && ctaUrl ? (
            <Section style={styles.buttonSection}>
              <Button style={styles.button} href={ctaUrl}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}

          {children}

          <Hr style={styles.hr} />
          <Text style={styles.subtleText}>{outro}</Text>
          {/* <Text style={styles.subtleText}>
            Guilders, Inc. · 3500 S. DuPont Highway, Dover, Delaware, USA
          </Text> */}
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f7f7f4",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e8e5dc",
    borderRadius: "14px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "28px",
  },
  brandSection: {
    alignItems: "center",
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
  },
  title: {
    color: "#193029",
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: "1.3",
    margin: "0 0 14px",
  },
  text: {
    color: "#2e3b36",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  buttonSection: {
    margin: "26px 0 24px",
    textAlign: "left" as const,
  },
  button: {
    backgroundColor: "#193029",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 18px",
    textDecoration: "none",
  },
  hr: {
    borderColor: "#ece9df",
    margin: "24px 0 14px",
  },
  subtleText: {
    color: "#66706b",
    fontSize: "12px",
    lineHeight: "1.6",
    margin: 0,
  },
};
