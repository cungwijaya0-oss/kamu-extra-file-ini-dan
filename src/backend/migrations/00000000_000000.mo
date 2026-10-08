import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  // Old stable shape: the deployed baseline had no stable fields.
  public type OldActor = {};

  // New stable shape: adds the authorization state, the clip-plan store and
  // its id counter.
  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    plans : Map.Map<Nat, ClipPlan>;
    state : { var nextPlanId : Nat };
  };

  // Inlined clip-plan types (migrations must be self-contained).
  public type AspectRatio = {
    #portrait;
    #square;
    #landscape;
  };

  public type Clip = {
    index : Nat;
    startSeconds : Nat;
    endSeconds : Nat;
    title : Text;
    caption : Text;
    hashtags : [Text];
  };

  public type ClipPlan = {
    id : Nat;
    owner : Principal;
    name : Text;
    createdAt : Int;
    sourceUrl : Text;
    sourceTitle : Text;
    channel : Text;
    durationSeconds : Nat;
    language : Text;
    maxClipSeconds : Nat;
    aspectRatio : AspectRatio;
    subtitlesEnabled : Bool;
    clips : [Clip];
  };

  public func migration(old : OldActor) : NewActor {
    ignore old;
    {
      accessControlState = AccessControl.initState();
      plans = Map.empty();
      state = { var nextPlanId = 0 };
    };
  };
};
