/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBSITE_URL: string;
  readonly VITE_DASHBOARD_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_NGROK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
