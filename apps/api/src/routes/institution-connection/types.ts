import { z } from "zod";

import type { InstitutionConnection as DbInstitutionConnection } from "../../db/schema/institution-connections";
import type { Institution } from "../../db/schema/institutions";
import type { ProviderConnection } from "../../db/schema/provider-connections";

export const institutionConnectionWithRelationsSchema = z.object({
  id: z.number(),
  institution_id: z.number(),
  provider_connection_id: z.number(),
  connection_id: z.string().nullable(),
  broken: z.boolean(),
  created_at: z.union([z.string(), z.date()]),
  institution: z.object({
    id: z.number(),
    name: z.string(),
    logo_url: z.string(),
    country: z.string().nullable(),
    enabled: z.boolean(),
  }),
  provider_connection: z
    .object({
      id: z.number(),
      provider_id: z.number(),
      user_id: z.string(),
    })
    .nullable(),
});

export type InstitutionConnection = DbInstitutionConnection & {
  institution: Institution;
  provider_connection: ProviderConnection | null;
};

export type InstitutionConnections = InstitutionConnection[];
