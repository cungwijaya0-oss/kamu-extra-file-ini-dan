import Common "common";

module {
  public type PlanId = Common.PlanId;
  public type Timestamp = Common.Timestamp;
  public type AspectRatio = Common.AspectRatio;

  // A single AI-selected segment of the source video.
  public type Clip = {
    index : Nat; // 0-based position in the plan
    startSeconds : Nat; // segment start, in whole seconds from video start
    endSeconds : Nat; // segment end, in whole seconds from video start
    title : Text; // short punchy title for the clip
    caption : Text; // social caption text
    hashtags : [Text]; // hashtag list, without the leading '#'
  };

  // A saved clip plan: the source video plus the AI-selected clips.
  public type ClipPlan = {
    id : PlanId;
    owner : Principal; // principal that generated the plan (row-level scope)
    name : Text; // unique display name for the plan
    createdAt : Timestamp; // signed nanoseconds
    sourceUrl : Text; // original YouTube URL
    sourceTitle : Text; // video title reported by the source
    channel : Text; // channel / uploader name
    durationSeconds : Nat; // total source video duration, in seconds
    language : Text; // detected transcript language code
    maxClipSeconds : Nat; // chosen max clip duration, in seconds
    aspectRatio : AspectRatio; // chosen output aspect ratio
    subtitlesEnabled : Bool; // whether subtitles were requested
    clips : [Clip]; // AI-selected clips
  };

  // Options chosen by the user when generating a plan.
  public type GenerateOptions = {
    maxClipSeconds : Nat; // 30 / 60 / 90 / 180
    aspectRatio : AspectRatio;
    subtitlesEnabled : Bool;
  };

  // Request to generate a plan from a YouTube URL plus options.
  public type GeneratePlanRequest = {
    url : Text;
    options : GenerateOptions;
  };

  // Typed failure reasons surfaced to the frontend.
  public type PlanError = {
    #invalidUrl : Text; // not a valid YouTube link
    #noCaptions : Text; // video has no usable captions/transcript
    #unreachable : Text; // video could not be fetched
    #aiFailure : Text; // AI analysis failed
  };

  // Result of a plan generation request.
  public type GeneratePlanResult = {
    #ok : ClipPlan;
    #err : PlanError;
  };
};
