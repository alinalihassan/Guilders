import { t } from "elysia";
import type { Static } from "elysia";

const BASE_URL = "https://api.frankfurter.dev/v1";

// Response schemas
const ratesResponseSchema = t.Object({
  base: t.String(),
  date: t.String(),
  rates: t.Record(t.String(), t.Number()),
});

const timeseriesResponseSchema = t.Object({
  base: t.String(),
  start_date: t.String(),
  end_date: t.String(),
  rates: t.Record(t.String(), t.Record(t.String(), t.Number())),
});

const currenciesResponseSchema = t.Record(t.String(), t.String());

type RatesResponse = Static<typeof ratesResponseSchema>;
type TimeseriesResponse = Static<typeof timeseriesResponseSchema>;
type CurrenciesResponse = Static<typeof currenciesResponseSchema>;

export class FrankfurterClient {
  private async fetch<T>(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams(params);
    const queryString = queryParams.toString();
    const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Frankfurter API request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getLatestRates(base = "EUR", symbols?: string[]): Promise<RatesResponse> {
    const params: Record<string, string> = { base };
    if (symbols?.length) {
      params.symbols = symbols.join(",");
    }

    return this.fetch<RatesResponse>("/latest", params);
  }

  async getHistoricalRates(date: string, base = "EUR", symbols?: string[]): Promise<RatesResponse> {
    const params: Record<string, string> = { base };
    if (symbols?.length) {
      params.symbols = symbols.join(",");
    }

    return this.fetch<RatesResponse>(`/${date}`, params);
  }

  async getTimeseries(
    startDate: string,
    endDate?: string,
    base = "EUR",
    symbols?: string[],
  ): Promise<TimeseriesResponse> {
    const params: Record<string, string> = { base };
    if (symbols?.length) {
      params.symbols = symbols.join(",");
    }

    const dateRange = endDate ? `${startDate}..${endDate}` : `${startDate}..`;

    return this.fetch<TimeseriesResponse>(`/${dateRange}`, params);
  }

  async getCurrencies(): Promise<CurrenciesResponse> {
    return this.fetch<CurrenciesResponse>("/currencies");
  }

  async convert(from: string, to: string, amount: number): Promise<number> {
    const data = await this.getLatestRates(from, [to]);
    const rate = data.rates[to];

    if (rate === undefined) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    return amount * rate;
  }
}

export const getFrankfurter = () => new FrankfurterClient();
