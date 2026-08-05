import { useCallback, useMemo } from "react";

import type { BuilderStep } from "@/lib/admin-store";
import { getAdminSnapshot, setBuilderSteps } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { toApiError } from "./errors";
import { isHttpData } from "./mode";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const BUILDER_STEPS_RESOURCE = "builderSteps";

/**
 * Repli de liste : référence **stable au niveau module**. Un `[]` littéral
 * recréé à chaque rendu suffirait à invalider tous les mémos en aval.
 */
const NO_BUILDER_STEPS: BuilderStep[] = [];

/**
 * Échec explicite du mode http pour les étapes du configurateur.
 *
 * Ces données font partie du contenu de site (pas d'endpoint REST dédié dans
 * `endpoints.ts`). L'endpoint sera défini en phase 4 (PLAN.md). En attendant,
 * on refuse de rester silencieux : une erreur explicite est préférable à un
 * résultat incorrect ou une perte silencieuse de données.
 */
function builderStepsHttpNotImplemented(): Promise<BuilderStep[]> {
  return Promise.reject(
    new Error(
      "builderSteps : aucun endpoint HTTP dédié n'est encore défini. " +
        "Cette ressource sera câblée en phase 4 (PLAN.md). " +
        "En mode http, les étapes du configurateur ne sont pas disponibles.",
    ),
  );
}

/**
 * Liste des étapes du configurateur — remplace `useAdminState().builderSteps`.
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : l'endpoint n'est pas encore défini (phase 4). Le hook renvoie
 * la liste vide avec une `ApiError` journalisée — jamais un échec silencieux
 * (`AGENTS.md` §7).
 */
export function useBuilderStepList(): ResourceState<BuilderStep[]> {
  return useResource<BuilderStep[]>({
    key: BUILDER_STEPS_RESOURCE,
    fromStore: (state) => state.builderSteps,
    fromHttp: async () => builderStepsHttpNotImplemented(),
    fallback: NO_BUILDER_STEPS,
  });
}

export type BuilderStepMutations = {
  replace: (steps: BuilderStep[]) => Promise<BuilderStep[]>;
};

/**
 * Mutations des étapes du configurateur. Toujours asynchrones, y compris en mock.
 *
 * En mode http : échec explicite tant que l'endpoint n'est pas défini (phase 4).
 */
export function useBuilderStepMutations(): BuilderStepMutations {
  const replace = useCallback((steps: BuilderStep[]) => {
    if (isHttpData()) {
      const error = toApiError(
        new Error(
          "builderSteps : mutation HTTP non implémentée. " +
            "L'endpoint sera défini en phase 4 (PLAN.md).",
        ),
      );
      return Promise.reject(error);
    }
    return runMutation(BUILDER_STEPS_RESOURCE, "replace", async () => {
      setBuilderSteps(steps);
      return getAdminSnapshot().builderSteps;
    });
  }, []);

  return useMemo(() => ({ replace }), [replace]);
}
