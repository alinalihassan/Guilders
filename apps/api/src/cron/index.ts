import { syncExchangeRates } from "./sync-exchange-rates";
import { syncInstitutions } from "./sync-institutions";

export async function handleScheduled(event: ScheduledEvent): Promise<void> {
  switch (event.cron) {
    case "0 * * * *":
      await syncExchangeRates();
      break;
    case "0 0 * * *":
      await syncInstitutions();
      break;
  }
}
