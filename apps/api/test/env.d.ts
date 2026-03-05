declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    USE_PGLITE: string;
    MIGRATIONS_SQL: string;
  }
}
