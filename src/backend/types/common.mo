module {
  // Cross-cutting types shared across domains.

  // Signed nanosecond timestamp (Time.now() returns Int).
  public type Timestamp = Int;

  // Unique identifier for a saved clip plan.
  public type PlanId = Nat;

  // Aspect ratio chosen by the user for the rendered short clips.
  public type AspectRatio = {
    #portrait; // 9:16 — TikTok / YouTube Shorts
    #square; // 1:1 — Instagram feed
    #landscape; // 16:9 — YouTube / wide
  };
};
