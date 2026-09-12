import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const mailDir = join(import.meta.dir, "..", ".local", "mail");
const latestPath = join(mailDir, "latest.json");

type MailRecord = {
  id: string;
  to: string;
  subject: string;
  text?: string;
  links: string[];
  htmlPath: string;
  at: string;
};

function readLatest(): MailRecord | null {
  if (!existsSync(latestPath)) return null;
  return JSON.parse(readFileSync(latestPath, "utf8")) as MailRecord;
}

function listMessages(): MailRecord[] {
  if (!existsSync(mailDir)) return [];
  return readdirSync(mailDir)
    .filter((name) => name.endsWith(".json") && name !== "latest.json")
    .map((name) => JSON.parse(readFileSync(join(mailDir, name), "utf8")) as MailRecord)
    .toSorted((a, b) => b.at.localeCompare(a.at));
}

const command = process.argv[2] ?? "latest";

if (command === "list") {
  const messages = listMessages();
  if (messages.length === 0) {
    console.log("No local mailbox messages. Trigger a password reset or email change, then retry.");
    process.exit(0);
  }
  console.log(JSON.stringify(messages, null, 2));
  process.exit(0);
}

const latest = readLatest();
if (!latest) {
  console.error("No .local/mail/latest.json yet. Sign up or request a password reset first.");
  process.exit(1);
}

if (command === "open") {
  const link = latest.links[0];
  if (!link) {
    console.error("Latest email has no http(s) links.");
    process.exit(1);
  }
  console.log(link);
  process.exit(0);
}

console.log(JSON.stringify(latest, null, 2));
