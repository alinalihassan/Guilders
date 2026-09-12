const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
const email = process.env.AGENT_EMAIL ?? "agent@guilders.test";
const password = process.env.AGENT_PASSWORD ?? "agent-agent-agent";
const name = process.env.AGENT_NAME ?? "Agent User";

const response = await fetch(`${backendUrl}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name }),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Sign-up failed (${response.status}): ${body}`);
  console.error("Start the API with `cd apps/api && bun run dev`, then retry.");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      email,
      password,
      dashboard: process.env.DASHBOARD_URL ?? "http://localhost:3002",
      login: `${process.env.DASHBOARD_URL ?? "http://localhost:3002"}/login`,
    },
    null,
    2,
  ),
);
