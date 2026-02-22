import { rate } from "../db/schema/rates";
import { db } from "../lib/db";
import { getFrankfurter } from "../lib/frankfurter";

export async function insertRates() {
  console.log("Inserting rates");
  const frankfurter = getFrankfurter();
  const rates = await frankfurter.getLatestRates("EUR");

  // First, fetch all supported currencies from the currency table
  const supportedCurrencies = await db.query.currency.findMany();

  // Filter rates to only include supported currencies
  const filteredRates = [
    ...Object.entries(rates.rates)
      .filter(([currencyCode]) =>
        supportedCurrencies.some((currency) => currency.code === currencyCode),
      )
      .map(([currencyCode, rateValue]) => ({
        currency_code: currencyCode,
        rate: rateValue.toString(),
      })),
  ];

  if (filteredRates.length === 0) {
    console.log("No supported currencies found in rates");
    return;
  }

  await db.insert(rate).values(
    filteredRates.map(({ currency_code, rate }) => ({
      currency_code,
      rate: rate.toString(),
    })),
  );

  console.log("Rates inserted successfully");
}
