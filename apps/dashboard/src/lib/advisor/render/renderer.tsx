"use client";

import type { ReactNode } from "react";
import {
  ActionProvider,
  Renderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
} from "@json-render/react";
import { registry } from "./registry";

interface AdvisorJsonRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

export function AdvisorJsonRenderer({
  spec,
  loading,
}: AdvisorJsonRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <StateProvider initialState={spec.state ?? {}}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer spec={spec} registry={registry} loading={loading} />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
