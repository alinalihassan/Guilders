import { t } from "elysia";

import type { InstitutionConnection as DbInstitutionConnection } from "../../db/schema/institution-connections";
import type { Institution } from "../../db/schema/institutions";
import type { ProviderConnection } from "../../db/schema/provider-connections";

export const institutionConnectionWithRelationsSchema = t.Object({
  id: t.Number(),
  institution_id: t.Number(),
  provider_connection_id: t.Number(),
  connection_id: t.Union([t.String(), t.Null()]),
  broken: t.Boolean(),
  created_at: t.Union([t.String(), t.Date()]),
  institution: t.Object({
    id: t.Number(),
    name: t.String(),
    logo_url: t.String(),
    country: t.Union([t.String(), t.Null()]),
    enabled: t.Boolean(),
  }),
  provider_connection: t.Union([
    t.Object({
      id: t.Number(),
      provider_id: t.Number(),
      user_id: t.String(),
    }),
    t.Null(),
  ]),
});

export const institutionConnectionIdParamSchema = t.Object({
  id: t.Number(),
});

export type InstitutionConnection = DbInstitutionConnection & {
  institution: Institution;
  provider_connection: ProviderConnection | null;
};

export type InstitutionConnections = InstitutionConnection[];
