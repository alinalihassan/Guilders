import { t } from "elysia";

import type { Institution as DbInstitution } from "../../db/schema/institutions";

export const institutionIdParamSchema = t.Object({
  id: t.Number(),
});

export type Institution = DbInstitution;
export type Institutions = Institution[];
