import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import Types "types/clips";
import ClipsLib "lib/clips";
import ClipsApi "mixins/clips-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // Saved clip plans, keyed by plan id.
  let plans : Map.Map<Types.PlanId, Types.ClipPlan>;
  // Monotonic id counter for new plans.
  let state : { var nextPlanId : Nat };

  // HTTP outcall transform callback (shared query member of the actor).
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  include ClipsApi(transform, plans, state);

  // OQL: expose saved clip plans, scoped to each signed-in caller.
  include Expose({
    entities = [
      plans.toEntityManual("clipPlan", "ClipPlan", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          createdAt = 0;
          sourceUrl = "";
          sourceTitle = "";
          channel = "";
          durationSeconds = 0;
          language = "";
          maxClipSeconds = 0;
          aspectRatio = #portrait;
          subtitlesEnabled = false;
          clips = [];
        })
        .payload("id", func(p) = p.id)
        .payload("owner", func(p) = p.owner)
        .payload("name", func(p) = p.name)
        .payload("createdAt", func(p) = p.createdAt)
        .payload("sourceUrl", func(p) = p.sourceUrl)
        .payload("sourceTitle", func(p) = p.sourceTitle)
        .payload("channel", func(p) = p.channel)
        .payload("durationSeconds", func(p) = p.durationSeconds)
        .payload("language", func(p) = p.language)
        .payload("maxClipSeconds", func(p) = p.maxClipSeconds)
        .payload("aspectRatio", func(p) = ClipsLib.aspectRatioText(p.aspectRatio))
        .payload("subtitlesEnabled", func(p) = p.subtitlesEnabled)
        .payload("clipCount", func(p) = p.clips.size())
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  });

  include ApiDocMixin();
};
