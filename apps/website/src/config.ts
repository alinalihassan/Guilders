const env = (key: string, fallback: string) => import.meta.env[key] ?? fallback;

export const DASHBOARD_URL = env("PUBLIC_DASHBOARD_URL", "https://dashboard.guilders.app");
export const API_URL = env("PUBLIC_API_URL", "https://api.guilders.app");
export const DOCS_URL = env("PUBLIC_DOCS_URL", "https://docs.guilders.app");
export const GITHUB_URL = "https://github.com/alinalihassan/Guilders";
