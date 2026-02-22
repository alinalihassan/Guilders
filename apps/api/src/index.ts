import { app } from "./app"
import { insertRates } from "./cron/insertRates";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return await app.fetch(request)
  },
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> => {
    switch (event.cron) {
      case "0 * * * *":
        await insertRates();
        break;
    }
  },
}