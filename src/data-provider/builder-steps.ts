import { useCallback, useMemo } from "react";

import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";
import type { BuilderStep } from "@/lib/admin-store";
import { setBuilderSteps } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
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
 * Lit la section `builder` depuis `GET /content` et en extrait `builder.steps`.
 *
 * Le backend stocke les étapes du configurateur dans la section « builder » de
 * la table `site_content`. La route `/content` retourne l'ensemble des sections ;
 * le provider en extrait uniquement `builder.steps`.
 */
async function fetchBuilderSteps(): Promise<BuilderStep[]> {
  const content = await http.get<Record<string, unknown>>(E.content.get());
  const builder = content?.builder;
  if (
    builder !== null &&
    builder !== undefined &&
    typeof builder === "object" &&
    !Array.isArray(builder) &&
    Array.isArray((builder as Record<string, unknown>).steps)
  ) {
    return (builder as { steps: BuilderStep[] }).steps;
  }
  return [];
}

/**
 * Liste des étapes du configurateur — remplace `useAdminState().builderSteps`.
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /content → builder.steps`.
 */
export function useBuilderStepList(): ResourceState<BuilderStep[]> {
  return useResource<BuilderStep[]>({
    key: BUILDER_STEPS_RESOURCE,
    fromStore: (state) => state.builderSteps,
    fromHttp: fetchBuilderSteps,
    fallback: NO_BUILDER_STEPS,
  });
}

export type BuilderStepMutations = {
  replace: (steps: BuilderStep[]) => Promise<BuilderStep[]>;
};

/**
 * Mutations des étapes du configurateur. Toujours asynchrones, y compris en mock.
 */
export function useBuilderStepMutations(): BuilderStepMutations {
  const replace = useCallback(
    (steps: BuilderStep[]) =>
      runMutation(BUILDER_STEPS_RESOURCE, "replace", async () => {
        if (isHttpData()) {
          await http.patch<void>(E.content.update(), { builder: { steps } });
          return steps;
        }
        setBuilderSteps(steps);
        return steps;
      }),
    [],
  );

  return useMemo(() => ({ replace }), [replace]);
}
