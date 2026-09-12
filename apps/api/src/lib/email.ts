import { render } from "@react-email/render";
import { env as cfEnv } from "cloudflare:workers";
import type { ReactElement } from "react";

const DEFAULT_FROM_NAME = "Guilders";
const DEFAULT_FROM_EMAIL = "noreply@guilders.app";

function parseFromAddress(value: string | undefined): EmailAddress {
  const raw = value?.trim();
  if (!raw) {
    return { name: DEFAULT_FROM_NAME, email: DEFAULT_FROM_EMAIL };
  }

  const named = raw.match(/^(.*)<([^>]+)>$/);
  const email = named?.[2]?.trim();
  if (email) {
    return {
      name: named[1]?.trim() || DEFAULT_FROM_NAME,
      email,
    };
  }

  return { name: DEFAULT_FROM_NAME, email: raw };
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<EmailSendResult> {
  if (!cfEnv.EMAIL) {
    throw new Error("Missing EMAIL send_email binding");
  }

  const html = await render(options.react);
  return cfEnv.EMAIL.send({
    from: parseFromAddress(process.env.EMAIL_FROM),
    to: options.to,
    subject: options.subject,
    html,
  });
}
