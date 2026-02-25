import { defineRelations } from "drizzle-orm";

import { account } from "./accounts";
import { session, user, user_account, verification } from "./auth";
import { category } from "./categories";
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
  user_account,
  session,
  user,
  category,
  account,
  country,
  currency,
  institutionConnection,
  institution,
  providerConnection,
  provider,
  rate,
  transaction,
  userSetting,
  verification,
};

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
    accounts: r.many.user_account({
      from: r.user.id,
      to: r.user_account.userId,
    }),
    categories: r.many.category({
      from: r.user.id,
      to: r.category.user_id,
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  user_account: {
    user: r.one.user({
      from: r.user_account.userId,
      to: r.user.id,
    }),
  },
  account: {
    currencyRel: r.one.currency({
      from: r.account.currency,
      to: r.currency.code,
      alias: "currencyRel",
    }),
    institutionConnection: r.one.institutionConnection({
      from: r.account.institution_connection_id,
      to: r.institutionConnection.id,
    }),
    transactions: r.many.transaction({
      from: r.account.id,
      to: r.transaction.account_id,
    }),
  },
  category: {
    user: r.one.user({
      from: r.category.user_id,
      to: r.user.id,
    }),
    transactions: r.many.transaction({
      from: r.category.id,
      to: r.transaction.category_id,
    }),
  },
  transaction: {
    account: r.one.account({
      from: r.transaction.account_id,
      to: r.account.id,
    }),
    currencyRel: r.one.currency({
      from: r.transaction.currency,
      to: r.currency.code,
      alias: "currencyRel",
    }),
    category: r.one.category({
      from: r.transaction.category_id,
      to: r.category.id,
    }),
  },
  currency: {
    accounts: r.many.account({
      from: r.currency.code,
      to: r.account.currency,
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
    accounts: r.many.account({
      from: r.institutionConnection.id,
      to: r.account.institution_connection_id,
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
