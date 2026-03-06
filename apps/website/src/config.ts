const env = (key: string, fallback: string) =>
  import.meta.env[key] ?? fallback;

export const DASHBOARD_URL = env("PUBLIC_DASHBOARD_URL", "http://localhost:3002");
export const API_URL = env("PUBLIC_API_URL", "http://localhost:3000");
export const DOCS_URL = env("PUBLIC_DOCS_URL", "http://localhost:3003");
export const GITHUB_URL = "https://github.com/alinalihassan/Guilders";
