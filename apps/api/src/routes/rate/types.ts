import { z } from "zod";

import type { Rate as DbRate } from "../../db/schema/rates";

export const rateQuerySchema = z.object({
  base: z.string().length(3).optional(),
  date: z.iso.date().optional(),
});

export type Rate = DbRate;
export type Rates = Rate[];
