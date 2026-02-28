import { defineRelations } from "drizzle-orm";

import { account } from "./accounts";
import { balanceSnapshot } from "./balance-snapshots";
import {
  apikey,
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
  passkey,
  session,
  twoFactor,
  user,
  user_account,
  verification,
} from "./auth";
import { category } from "./categories";
import { country } from "./countries";
import { currency } from "./currencies";
import { institutionConnection } from "./institution-connections";
import { institution } from "./institutions";
import { providerConnection } from "./provider-connections";
import { provider } from "./providers";
import { rate } from "./rates";
import { transaction } from "./transactions";


const schema = {
  user_account,
  session,
  user,
  apikey,
  twoFactor,
  passkey,
  oauthClient,
  oauthRefreshToken,
  oauthAccessToken,
  oauthConsent,
  category,
  account,
  balanceSnapshot,
  country,
  currency,
  institutionConnection,
  institution,
  providerConnection,
  provider,
  rate,
  transaction,
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
    apikeys: r.many.apikey({
      from: r.user.id,
      to: r.apikey.userId,
    }),
    twoFactors: r.many.twoFactor({
      from: r.user.id,
      to: r.twoFactor.userId,
    }),
    passkeys: r.many.passkey({
      from: r.user.id,
      to: r.passkey.userId,
    }),
    oauthClients: r.many.oauthClient({
      from: r.user.id,
      to: r.oauthClient.userId,
    }),
    oauthRefreshTokens: r.many.oauthRefreshToken({
      from: r.user.id,
      to: r.oauthRefreshToken.userId,
    }),
    oauthAccessTokens: r.many.oauthAccessToken({
      from: r.user.id,
      to: r.oauthAccessToken.userId,
    }),
    oauthConsents: r.many.oauthConsent({
      from: r.user.id,
      to: r.oauthConsent.userId,
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
    oauthRefreshTokens: r.many.oauthRefreshToken({
      from: r.session.id,
      to: r.oauthRefreshToken.sessionId,
    }),
    oauthAccessTokens: r.many.oauthAccessToken({
      from: r.session.id,
      to: r.oauthAccessToken.sessionId,
    }),
  },
  user_account: {
    user: r.one.user({
      from: r.user_account.userId,
      to: r.user.id,
    }),
  },
  apikey: {
    user: r.one.user({
      from: r.apikey.userId,
      to: r.user.id,
    }),
  },
  twoFactor: {
    user: r.one.user({
      from: r.twoFactor.userId,
      to: r.user.id,
    }),
  },
  passkey: {
    user: r.one.user({
      from: r.passkey.userId,
      to: r.user.id,
    }),
  },
  oauthClient: {
    user: r.one.user({
      from: r.oauthClient.userId,
      to: r.user.id,
    }),
    oauthRefreshTokens: r.many.oauthRefreshToken({
      from: r.oauthClient.clientId,
      to: r.oauthRefreshToken.clientId,
    }),
    oauthAccessTokens: r.many.oauthAccessToken({
      from: r.oauthClient.clientId,
      to: r.oauthAccessToken.clientId,
    }),
    oauthConsents: r.many.oauthConsent({
      from: r.oauthClient.clientId,
      to: r.oauthConsent.clientId,
    }),
  },
  oauthRefreshToken: {
    oauthClient: r.one.oauthClient({
      from: r.oauthRefreshToken.clientId,
      to: r.oauthClient.clientId,
    }),
    session: r.one.session({
      from: r.oauthRefreshToken.sessionId,
      to: r.session.id,
    }),
    user: r.one.user({
      from: r.oauthRefreshToken.userId,
      to: r.user.id,
    }),
    oauthAccessTokens: r.many.oauthAccessToken({
      from: r.oauthRefreshToken.id,
      to: r.oauthAccessToken.refreshId,
    }),
  },
  oauthAccessToken: {
    oauthClient: r.one.oauthClient({
      from: r.oauthAccessToken.clientId,
      to: r.oauthClient.clientId,
    }),
    session: r.one.session({
      from: r.oauthAccessToken.sessionId,
      to: r.session.id,
    }),
    user: r.one.user({
      from: r.oauthAccessToken.userId,
      to: r.user.id,
    }),
    oauthRefreshToken: r.one.oauthRefreshToken({
      from: r.oauthAccessToken.refreshId,
      to: r.oauthRefreshToken.id,
    }),
  },
  oauthConsent: {
    oauthClient: r.one.oauthClient({
      from: r.oauthConsent.clientId,
      to: r.oauthClient.clientId,
    }),
    user: r.one.user({
      from: r.oauthConsent.userId,
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
    balanceSnapshots: r.many.balanceSnapshot({
      from: r.account.id,
      to: r.balanceSnapshot.account_id,
    }),
  },
  balanceSnapshot: {
    account: r.one.account({
      from: r.balanceSnapshot.account_id,
      to: r.account.id,
    }),
    currencyRel: r.one.currency({
      from: r.balanceSnapshot.currency,
      to: r.currency.code,
      alias: "currencyRel",
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
