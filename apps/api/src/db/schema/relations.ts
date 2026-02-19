import { defineRelations } from "drizzle-orm";
import { asset } from "./assets";
import { country } from "./countries";
import { currency } from "./currencies";
import { institutionConnection } from "./institution-connections";
import { institution } from "./institutions";
import { providerConnection } from "./provider-connections";
import { provider } from "./providers";
import { rate } from "./rates";
import { transaction } from "./transactions";
import { userSetting } from "./user-settings";

const schema = {
  asset,
  country,
  currency,
  institutionConnection,
  institution,
  providerConnection,
  provider,
  rate,
  transaction,
  userSetting,
};

export const relations = defineRelations(schema, (r) => ({
  asset: {
    currencyRel: r.one.currency({
      from: r.asset.currency,
      to: r.currency.code,
      alias: "currencyRel",
    }),
    institutionConnection: r.one.institutionConnection({
      from: r.asset.institution_connection_id,
      to: r.institutionConnection.id,
    }),
    transactions: r.many.transaction({
      from: r.asset.id,
      to: r.transaction.asset_id,
    }),
  },
  transaction: {
    asset: r.one.asset({
      from: r.transaction.asset_id,
      to: r.asset.id,
    }),
    currencyRel: r.one.currency({
      from: r.transaction.currency,
      to: r.currency.code,
      alias: "currencyRel",
    }),
  },
  currency: {
    assets: r.many.asset({
      from: r.currency.code,
      to: r.asset.currency,
    }),
    rates: r.many.rate({
      from: r.currency.code,
      to: r.rate.currency_code,
    }),
    transactions: r.many.transaction({
      from: r.currency.code,
      to: r.transaction.currency,
    }),
    userSettings: r.many.userSetting({
      from: r.currency.code,
      to: r.userSetting.currency,
    }),
    countries: r.many.country({
      from: r.currency.code,
      to: r.country.currency_code,
    }),
  },
  rate: {
    currencyRel: r.one.currency({
      from: r.rate.currency_code,
      to: r.currency.code,
      alias: "currencyRel",
    }),
  },
  providerConnection: {
    provider: r.one.provider({
      from: r.providerConnection.provider_id,
      to: r.provider.id,
    }),
    institutionConnections: r.many.institutionConnection({
      from: r.providerConnection.id,
      to: r.institutionConnection.provider_connection_id,
    }),
  },
  institutionConnection: {
    providerConnection: r.one.providerConnection({
      from: r.institutionConnection.provider_connection_id,
      to: r.providerConnection.id,
    }),
    institution: r.one.institution({
      from: r.institutionConnection.institution_id,
      to: r.institution.id,
    }),
    assets: r.many.asset({
      from: r.institutionConnection.id,
      to: r.asset.institution_connection_id,
    }),
  },
  institution: {
    provider: r.one.provider({
      from: r.institution.provider_id,
      to: r.provider.id,
    }),
    institutionConnections: r.many.institutionConnection({
      from: r.institution.id,
      to: r.institutionConnection.institution_id,
    }),
    countryRel: r.one.country({
      from: r.institution.country,
      to: r.country.code,
      alias: "countryRel",
    }),
  },
  provider: {
    providerConnections: r.many.providerConnection({
      from: r.provider.id,
      to: r.providerConnection.provider_id,
    }),
    institutions: r.many.institution({
      from: r.provider.id,
      to: r.institution.provider_id,
    }),
  },
  userSetting: {
    currencyRel: r.one.currency({
      from: r.userSetting.currency,
      to: r.currency.code,
      alias: "currencyRel",
    }),
  },
  country: {
    institutions: r.many.institution({
      from: r.country.code,
      to: r.institution.country,
    }),
    currencyRel: r.one.currency({
      from: r.country.currency_code,
      to: r.currency.code,
      alias: "currencyRel",
    }),
  },
}));
