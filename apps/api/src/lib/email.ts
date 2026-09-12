import { render } from "@react-email/components";
import { env as cfEnv } from "cloudflare:workers";
import type { ReactElement } from "react";

const FROM = {
  email: "noreply@guilders.app",
  name: "Guilders",
} as const;

export async function sendEmail(options: { to: string; subject: string; react: ReactElement }) {
  const html = await render(options.react);
  return cfEnv.EMAIL.send({
    from: FROM,
    to: options.to,
    subject: options.subject,
    html,
  });
}
