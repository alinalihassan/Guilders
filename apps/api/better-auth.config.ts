import { createAuth } from "./src/lib/auth";

/** CLI entry for `bun run auth:generate`. Not imported by the Worker. */
export const auth = createAuth();
