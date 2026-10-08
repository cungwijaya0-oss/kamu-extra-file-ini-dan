import Map "mo:core/Map";
import Principal "mo:core/Principal";
import OutCall "mo:caffeineai-http-outcalls/outcall";

import Types "../types/clips";
import ClipsLib "../lib/clips";

mixin (
  transform : OutCall.Transform,
  plans : Map.Map<Types.PlanId, Types.ClipPlan>,
  state : { var nextPlanId : Nat },
) {
  // Generate a clip plan from a YouTube URL plus the chosen options.
  public shared ({ caller }) func generatePlan(
    request : Types.GeneratePlanRequest,
  ) : async Types.GeneratePlanResult {
    await* ClipsLib.generatePlan(transform, plans, state, caller, request);
  };

  // List every saved plan for the caller, newest first.
  public query ({ caller }) func listPlans() : async [Types.ClipPlan] {
    ClipsLib.listPlans(plans, caller);
  };

  // Read a single saved plan by id.
  public query ({ caller }) func getPlan(id : Types.PlanId) : async ?Types.ClipPlan {
    ClipsLib.getPlan(plans, caller, id);
  };

  // Delete a saved plan by id. Returns true when a plan was removed.
  public shared ({ caller }) func deletePlan(id : Types.PlanId) : async Bool {
    ClipsLib.deletePlan(plans, caller, id);
  };
};
