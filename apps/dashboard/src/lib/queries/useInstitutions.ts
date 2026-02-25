import type { Institution } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

import { useAccounts } from "./useAccounts";
import { useInstitutionConnection } from "./useInstitutionConnection";

const queryKey = ["institutions"] as const;

export function useInstitutions() {
  return useQuery<Institution[], Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.institution.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Institution[];
    },
  });
}

export function useInstitutionById(institutionId: number | undefined) {
  const { data: institutions } = useInstitutions();
  return institutions?.find((i) => i.id === institutionId);
}

export function useInstitutionByAccountId(accountId: number | undefined) {
  const { data: accounts } = useAccounts();
  const account = accounts?.find((a) => a.id === accountId);
  const { data: institutionConnection } = useInstitutionConnection(
    account?.institution_connection_id ?? 0,
  );

  return useInstitutionById(institutionConnection?.institution_id);
}
