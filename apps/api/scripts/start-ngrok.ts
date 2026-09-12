import { spawn } from "node:child_process";

const token = process.env.NGROK_TOKEN || process.env.NGROK_AUTHTOKEN;
const url = process.env.NGROK_URL;

if (!token || !url) {
  console.error("Set NGROK_TOKEN and NGROK_URL in apps/api/.env");
  process.exit(1);
}

const child = spawn("ngrok", ["http", "3000", "--authtoken", token, "--url", url], {
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
