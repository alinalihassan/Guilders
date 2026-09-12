import { render, toPlainText } from "@react-email/components";
import { env as cfEnv } from "cloudflare:workers";
import type { ReactElement } from "react";

const FROM = {
  email: "noreply@guilders.app",
  name: "Guilders",
} as const;

function extractHttpLinks(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href): href is string => !!href && /^https?:\/\//.test(href));
}

/** Local wrangler / bun only. Agents read `.local/mail/latest.json` and click the links. */
async function captureDevMailbox(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "production") {
    return;
  }

  const links = extractHttpLinks(message.html);
  console.info("[mailbox]", JSON.stringify({ to: message.to, subject: message.subject, links }));

  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), ".local", "mail");
    await mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const htmlPath = join(dir, `${id}.html`);
    await writeFile(htmlPath, message.html);
    const record = {
      id,
      to: message.to,
      subject: message.subject,
      text: message.text,
      links,
      htmlPath,
      at: new Date().toISOString(),
    };
    await writeFile(join(dir, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
    await writeFile(join(dir, "latest.json"), `${JSON.stringify(record, null, 2)}\n`);
  } catch (error) {
    console.warn("[mailbox] Could not write .local/mail", error);
  }
}

export async function sendEmail(options: { to: string; subject: string; react: ReactElement }) {
  const html = await render(options.react);
  const text = toPlainText(html);

  await captureDevMailbox({
    to: options.to,
    subject: options.subject,
    html,
    text,
  });

  try {
    return await cfEnv.EMAIL.send({
      from: FROM,
      to: options.to,
      subject: options.subject,
      html,
      text,
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
