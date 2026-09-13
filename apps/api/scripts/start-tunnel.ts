import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TUNNEL_NAME = "local-dev";
const TUNNEL_ID = "1084335f-9097-4f1e-b7dc-f4a84ddf1cb4";
const HOSTNAME = "local-dev.guilders.app";
const ORIGIN = "http://127.0.0.1:3000";

const credentialsFile = join(homedir(), ".cloudflared", `${TUNNEL_ID}.json`);
const configDir = join(import.meta.dir, "..", ".wrangler");
const configPath = join(configDir, "cloudflared.yml");

mkdirSync(configDir, { recursive: true });
writeFileSync(
  configPath,
  [
    `tunnel: ${TUNNEL_ID}`,
    `credentials-file: ${credentialsFile}`,
    "ingress:",
    `  - hostname: ${HOSTNAME}`,
    `    service: ${ORIGIN}`,
    "  - service: http_status:404",
    "",
  ].join("\n"),
);

const child = spawn(
  "cloudflared",
  ["tunnel", "--no-autoupdate", "--config", configPath, "run", TUNNEL_NAME],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 1));
