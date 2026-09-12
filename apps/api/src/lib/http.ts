import { flattenErrors } from "@hono/standard-validator";
import type { Context } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { ValidationTargets } from "hono/types";
import { z } from "zod";

import { errorSchema } from "../utils/error";

export const idParamSchema = z.object({
  id: z.coerce.number().int(),
});

export const stringIdParamSchema = z.object({
  id: z.string().min(1),
});

export const codeParamSchema = z.object({
  code: z.string().length(3),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export function jsonError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500,
  error: string,
) {
  return c.json({ error }, status);
}

/**
 * Standard Schema validation via hono-openapi (wraps @hono/standard-validator)
 * so request schemas are included in the OpenAPI document.
 */
export function validate<Schema extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: Schema,
) {
  return validator(target, schema, (result, c) => {
    if (!result.success) {
      const flattened = flattenErrors(result.error);
      const firstField = Object.values(flattened.fieldErrors)[0]?.[0];
      const message = flattened.formErrors[0] ?? firstField ?? "Invalid request";
      return c.json({ error: message }, 400);
    }
  });
}

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500;

export function documented(options: {
  tags?: string[];
  summary: string;
  description?: string;
  hide?: boolean;
  responses: Partial<Record<StatusCode, z.ZodType>>;
}) {
  const responses: Record<
    string,
    { description: string; content: Record<string, { schema: ReturnType<typeof resolver> }> }
  > = {};

  for (const [status, schema] of Object.entries(options.responses)) {
    if (!schema) continue;
    responses[status] = {
      description: schema === errorSchema ? "Error" : "OK",
      content: {
        "application/json": { schema: resolver(schema) },
      },
    };
  }

  return describeRoute({
    tags: options.tags,
    summary: options.summary,
    description: options.description,
    hide: options.hide,
    security: options.hide ? undefined : [{ apiKeyAuth: [] }, { bearerAuth: [] }],
    responses,
  });
}
