import { createActor } from "@/backend";
import type {
  ClipPlan,
  GenerateOptions,
  GeneratePlanResult,
  PlanId,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const planKeys = {
  all: ["plans"] as const,
  list: () => [...planKeys.all, "list"] as const,
  detail: (id: PlanId) => [...planKeys.all, "detail", id.toString()] as const,
};

/** List every saved clip plan for the signed-in user. */
export function useListPlans() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: async (): Promise<ClipPlan[]> => {
      if (!actor) return [];
      return actor.listPlans();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Load a single saved clip plan by id. */
export function useGetPlan(id: PlanId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: planKeys.detail(id ?? 0n),
    queryFn: async (): Promise<ClipPlan | null> => {
      if (!actor || id === undefined) return null;
      return actor.getPlan(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

/** Run the AI pipeline for a YouTube URL and persist the resulting plan. */
export function useGeneratePlan() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      url: string;
      options: GenerateOptions;
    }): Promise<GeneratePlanResult> => {
      if (!actor) throw new Error("Backend belum siap. Coba lagi sebentar.");
      return actor.generatePlan(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

/** Delete a saved plan and refresh the library. */
export function useDeletePlan() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: PlanId): Promise<boolean> => {
      if (!actor) throw new Error("Backend belum siap. Coba lagi sebentar.");
      return actor.deletePlan(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
