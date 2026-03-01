import { snapshotBalances } from "./snapshot-balances";
import { syncConnectionDataCron } from "./sync-connection-data";
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
    case "0 */6 * * *":
      await syncConnectionDataCron();
      break;
    case "0 23 * * *":
      await snapshotBalances();
      break;
  }
}
