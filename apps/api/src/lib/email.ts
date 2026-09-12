import { render, toPlainText } from "@react-email/components";
import { env as cfEnv } from "cloudflare:workers";
import type { ReactElement } from "react";

const FROM = {
  email: "noreply@guilders.app",
  name: "Guilders",
} as const;

export async function sendEmail(options: { to: string; subject: string; react: ReactElement }) {
  const html = await render(options.react);

  try {
    return await cfEnv.EMAIL.send({
      from: FROM,
      to: options.to,
      subject: options.subject,
      html,
      text: toPlainText(html),
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : undefined;
    console.error("[email] Failed to send", {
      to: options.to,
      subject: options.subject,
      code,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}
