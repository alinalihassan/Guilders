// @ts-nocheck
// oxlint-disable typescript/no-explicit-any
import { getAuth } from "./auth";

let _schema: ReturnType<ReturnType<typeof getAuth>["api"]["generateOpenAPISchema"]>;
const getSchema = async () => (_schema ??= getAuth().api.generateOpenAPISchema());

export const AuthOpenAPI = {
  getPaths: (prefix = "/api/auth") =>
    getSchema().then(({ paths }) => {
      const reference: typeof paths = Object.create(null);

      for (const path of Object.keys(paths)) {
        const key = prefix + path;
        if (!paths[path]) continue;
        reference[key] = paths[path];

        for (const method of Object.keys(paths[path])) {
          const operation = (reference[key] as any)[method];

          operation.tags = ["Authentication"];
        }
      }

      return reference;
    }) as Promise<any>,
  components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
