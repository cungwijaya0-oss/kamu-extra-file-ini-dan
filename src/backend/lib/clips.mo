import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";

import OutCall "mo:caffeineai-http-outcalls/outcall";
import { fromEnv } "mo:caffeineai-inference-client/Config";
import ChatApi "mo:caffeineai-inference-client/Apis/ChatApi";
import ChatCompletionRequest "mo:caffeineai-inference-client/Models/ChatCompletionRequest";
import ChatCompletionRequestMessageOneOf2 "mo:caffeineai-inference-client/Models/ChatCompletionRequestMessageOneOf2";

import Types "../types/clips";

module {
  // ---------------------------------------------------------------------------
  // YouTube URL parsing
  // ---------------------------------------------------------------------------

  // Extract the 11-character video id from any supported YouTube URL form:
  //   https://www.youtube.com/watch?v=VIDEOID
  //   https://youtu.be/VIDEOID
  //   https://www.youtube.com/shorts/VIDEOID
  //   https://www.youtube.com/embed/VIDEOID
  // Returns null when the link is not a recognizable YouTube video URL.
  public func parseVideoId(url : Text) : ?Text {
    let trimmed = url.trim(#predicate(func(c : Char) : Bool = c == ' ' or c == '\t' or c == '\n' or c == '\r'));
    if (trimmed.size() == 0) { return null };

    // Strip an optional scheme, then the leading "www." / "m." host prefix.
    let noScheme = switch (trimmed.stripStart(#text "https://")) {
      case (?rest) rest;
      case null switch (trimmed.stripStart(#text "http://")) {
        case (?rest) rest;
        case null trimmed;
      };
    };
    let hostAndPath = switch (noScheme.stripStart(#text "www.")) {
      case (?rest) rest;
      case null switch (noScheme.stripStart(#text "m.")) {
        case (?rest) rest;
        case null noScheme;
      };
    };

    // youtu.be/VIDEOID[?...]
    switch (hostAndPath.stripStart(#text "youtu.be/")) {
      case (?rest) { return cleanId(rest) };
      case null {};
    };

    // youtube.com/... — only accept the known video-bearing paths.
    switch (hostAndPath.stripStart(#text "youtube.com/")) {
      case (?rest) {
        // watch?v=VIDEOID
        switch (rest.stripStart(#text "watch")) {
          case (?afterWatch) {
            switch (queryParam(afterWatch, "v")) {
              case (?id) { return cleanId(id) };
              case null {};
            };
          };
          case null {};
        };
        // shorts/VIDEOID or embed/VIDEOID
        switch (rest.stripStart(#text "shorts/")) {
          case (?id) { return cleanId(id) };
          case null {};
        };
        switch (rest.stripStart(#text "embed/")) {
          case (?id) { return cleanId(id) };
          case null {};
        };
        null;
      };
      case null { null };
    };
  };

  // Trim a trailing query string / fragment / path and validate the id shape.
  func cleanId(raw : Text) : ?Text {
    let cut = raw.split(#predicate(func(c : Char) : Bool = c == '?' or c == '&' or c == '#' or c == '/'));
    let id = switch (cut.next()) { case (?s) s; case null raw };
    if (isVideoId(id)) { ?id } else { null };
  };

  // A YouTube video id is exactly 11 chars of [A-Za-z0-9_-].
  func isVideoId(id : Text) : Bool {
    if (id.size() != 11) { return false };
    id.foldLeft(true, func(ok, c) = ok and isIdChar(c));
  };

  func isIdChar(c : Char) : Bool {
    (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z') or
    (c >= '0' and c <= '9') or c == '-' or c == '_';
  };

  // Slice a char array from `start` (inclusive) for `len` chars.
  func slice(chars : [Char], start : Nat, len : Nat) : Text {
    Text.fromIter(chars.values().drop(start).take(len));
  };

  // Read a `key=value` pair from a query string (leading '?' optional).
  func queryParam(queryText : Text, key : Text) : ?Text {
    let q = switch (queryText.stripStart(#text "?")) {
      case (?rest) rest;
      case null queryText;
    };
    for (pair in q.split(#predicate(func(c : Char) : Bool = c == '&'))) {
      switch (pair.stripStart(#text (key # "="))) {
        case (?value) { return ?value };
        case null {};
      };
    };
    null;
  };

  // ---------------------------------------------------------------------------
  // Transcript fetching (youtube-transcript.ai, no API key)
  // ---------------------------------------------------------------------------

  // Parsed transcript document returned by the endpoint.
  public type Transcript = {
    title : Text;
    channel : Text; // channel / uploader name, or a neutral fallback
    language : Text;
    durationSeconds : Nat;
    body : Text; // timestamped transcript text handed to the AI
  };

  // Fetch and parse the transcript for a video id. Returns null when the
  // endpoint reports no captions (404) or the body cannot be parsed.
  //
  // The upstream youtube-transcript.ai response carries a non-ASCII header
  // value (`x-partnership: ... — ...`, an em-dash). The IC's HTTP outcall layer
  // parses response headers with Rust's `HeaderValue::to_str()`, which only
  // accepts visible ASCII (32-127); the em-dash makes that parse fail with
  // IC0406 "Failed to parse headers: failed to convert header to a str" BEFORE
  // the transform callback ever runs. The transform cannot strip headers early
  // enough to help.
  //
  // We therefore fetch through the r.jina.ai text proxy, which returns the same
  // transcript document with ASCII-only response headers, so the IC can parse
  // the response and hand the body to our transform.
  public func fetchTranscript(
    transform : OutCall.Transform,
    videoId : Text,
  ) : async ?Transcript {
    let url = "https://r.jina.ai/https://youtube-transcript.ai/transcript/" # videoId # ".txt";
    let response = await OutCall.httpRequest({
      url;
      method = #get;
      headers = [{ name = "Accept"; value = "text/plain" }];
      body = null;
      maxResponseBytes = 1_000_000;
      transform;
    });
    if (response.status != 200) { return null };
    let ?text = response.body.decodeUtf8() else { return null };
    parseTranscript(text, videoId);
  };

  // Parse the Markdown document: a metadata header followed by the transcript.
  // `videoId` is used as a neutral channel fallback when the source carries no
  // channel/uploader metadata, so the Channel field is never blank.
  //
  // The document may arrive wrapped by the r.jina.ai text proxy, which prefixes
  // "Title:" / "URL Source:" / "Markdown Content:" lines and appends a
  // "---" + "Generated by ..." footer. We scan for the transcript markers and
  // stop the body at the footer, so both the raw and proxied forms parse.
  func parseTranscript(text : Text, videoId : Text) : ?Transcript {
    var title = "";
    var channel = "";
    var language = "";
    var durationSeconds = 0;
    var inBody = false;
    let bodyLines = List.empty<Text>();

    for (line in text.split(#predicate(func(c : Char) : Bool = c == '\n'))) {
      let clean = line.trim(#predicate(func(c : Char) : Bool = c == '\r' or c == ' '));
      if (not inBody) {
        if (clean.startsWith(#text "## Transcript")) {
          inBody := true;
        } else if (clean.startsWith(#text "# Transcript:")) {
          title := clean.trimStart(#text "# Transcript:").trim(#predicate(func(c : Char) : Bool = c == ' '));
        } else if (clean.startsWith(#text "Channel:")) {
          // Optional "Channel: <name>" metadata line, when the source provides it.
          channel := clean.trimStart(#text "Channel:").trim(#predicate(func(c : Char) : Bool = c == ' '));
        } else if (clean.startsWith(#text "Language:")) {
          // "Language: en · Duration: 3:27 · Words: 481"
          let rest = clean.trimStart(#text "Language:");
          let parts = rest.split(#predicate(func(c : Char) : Bool = c == '·'));
          let langPart = switch (parts.next()) { case (?s) s; case null rest };
          language := langPart.trim(#predicate(func(c : Char) : Bool = c == ' '));
          // Duration is the next segment.
          switch (parts.next()) {
            case (?durPart) {
              let d = durPart.trim(#predicate(func(c : Char) : Bool = c == ' '));
              durationSeconds := parseDuration(d.trimStart(#text "Duration:").trim(#predicate(func(c : Char) : Bool = c == ' ')));
            };
            case null {};
          };
        };
      } else {
        // Stop at the proxy's trailing footer so it never reaches the AI prompt.
        if (clean == "---" or clean.startsWith(#text "Generated by")) {
          inBody := false;
        } else if (clean.size() > 0) {
          bodyLines.add(clean);
        };
      };
    };

    if (bodyLines.size() == 0) { return null };
    // Fall back to a neutral, non-empty label when the source has no channel.
    let resolvedChannel = if (channel.size() > 0) { channel } else { "YouTube · " # videoId };
    ?{
      title;
      channel = resolvedChannel;
      language;
      durationSeconds;
      body = bodyLines.toArray().values().join("\n");
    };
  };

  // Parse "3:27" or "1:02:03" into whole seconds.
  func parseDuration(text : Text) : Nat {
    var total = 0;
    for (part in text.split(#predicate(func(c : Char) : Bool = c == ':'))) {
      let n = switch (part.toNat()) { case (?v) v; case null 0 };
      total := total * 60 + n;
    };
    total;
  };

  // ---------------------------------------------------------------------------
  // AI clip selection
  // ---------------------------------------------------------------------------

  // One clip as returned by the model, before it is assigned an index.
  type RawClip = {
    startSeconds : Nat;
    endSeconds : Nat;
    title : Text;
    caption : Text;
    hashtags : [Text];
  };

  // Ask the model to select the best moments and write copy for each.
  // Returns null when the model output cannot be parsed into clips.
  public func selectClips(
    transcript : Transcript,
    options : Types.GenerateOptions,
  ) : async* ?[RawClip] {
    let prompt = buildPrompt(transcript, options);
    let raw = try {
      ?(await* runChat<system>(prompt));
    } catch (_) {
      null;
    };
    switch (raw) {
      case (?text) { parseClips(text, options.maxClipSeconds) };
      case null { null };
    };
  };

  // Maximum number of transcript characters embedded into the prompt. The full
  // transcript can be very large; an unbounded prompt makes the model echo back
  // an equally large response, which is what drove the response parser past the
  // wasm stack. Bounding the input keeps the request (and the expected reply)
  // small while still giving the model enough context to pick moments.
  let maxPromptTranscriptChars : Nat = 12_000;

  // Build the analysis prompt. The model must answer with strict JSON.
  func buildPrompt(transcript : Transcript, options : Types.GenerateOptions) : Text {
    let ratio = switch (options.aspectRatio) {
      case (#portrait) "9:16 (TikTok / YouTube Shorts)";
      case (#square) "1:1 (Instagram feed)";
      case (#landscape) "16:9 (YouTube)";
    };
    let subtitles = if (options.subtitlesEnabled) "with on-screen subtitles" else "without subtitles";
    let maxClips = clipCount(transcript.durationSeconds, options.maxClipSeconds);
    let body = truncateText(transcript.body, maxPromptTranscriptChars);
    let truncationNote = if (body.size() < transcript.body.size()) {
      "\n[Catatan: transkrip dipotong pada " # maxPromptTranscriptChars.toText()
      # " karakter pertama. Pilih momen hanya dari bagian yang tersedia.]"
    } else { "" };

    "You are a viral short-form video editor. Analyse the transcript of a YouTube video and "
    # "select the " # maxClips.toText() # " most engaging moments that each fit within "
    # options.maxClipSeconds.toText() # " seconds.\n\n"
    # "Video title: " # transcript.title # "\n"
    # "Language: " # transcript.language # "\n"
    # "Total duration: " # transcript.durationSeconds.toText() # " seconds\n"
    # "Target aspect ratio: " # ratio # "\n"
    # "Output format: " # subtitles # "\n\n"
    # "Transcript (with [mm:ss] timestamps):\n" # body # truncationNote # "\n\n"
    # "Respond with ONLY a JSON object, no markdown fences, in this exact shape:\n"
    # "{\"clips\":[{\"startSeconds\":0,\"endSeconds\":30,\"title\":\"...\",\"caption\":\"...\",\"hashtags\":[\"tag1\",\"tag2\"]}]}\n"
    # "Rules: startSeconds and endSeconds are whole seconds from the video start; "
    # "endSeconds - startSeconds must be at most " # options.maxClipSeconds.toText() # "; "
    # "hashtags are lowercase without the leading '#'; write the title and caption in the "
    # "transcript's language.";
  };

  // Return at most `max` characters of `text`, without splitting a UTF-8
  // sequence. Iterative and allocation-bounded.
  func truncateText(text : Text, max : Nat) : Text {
    if (text.size() <= max) { return text };
    Text.fromIter(text.chars().take(max));
  };

  // How many clips to ask for, based on video length and max clip duration.
  func clipCount(durationSeconds : Nat, maxClipSeconds : Nat) : Nat {
    if (maxClipSeconds == 0) { return 1 };
    let raw = durationSeconds / maxClipSeconds;
    if (raw < 1) { 1 } else if (raw > 8) { 8 } else { raw };
  };

  // Run one chat completion through Caffeine Inference and return the raw
  // assistant text.
  //
  // We call the platform-supported `ChatApi.createChatCompletion` so the
  // request is authenticated with the credentials the platform provisions for
  // the app. `Config.fromEnv<system>()` is resolved inside this helper on every
  // request, so a rotated credential is picked up and the bearer never reaches
  // actor state. A hand-built `_Ic.http_request` that reads the config directly
  // traps with IC0503 "CAFFEINE_INFERENCE_API_KEY is not set" because that env
  // var is not set in the canister.
  //
  // The client's typed response already gives us the assistant message content
  // as a `?Text`, so we never tree-walk the raw JSON with `serde-core`'s
  // `JSON.toCandid` (whose `parser-combinators` `many`/`valueParser` are
  // non-tail recursive and overflow the wasm stack on large responses).
  func runChat<system>(prompt : Text) : async* Text {
    let config = fromEnv<system>();
    let userMessage = ChatCompletionRequestMessageOneOf2.JSON.init({
      content = #string(prompt);
      role = #user;
    });
    let req = ChatCompletionRequest.JSON.init({
      messages = [#user(userMessage)];
      model = "router";
    });
    let resp = await* ChatApi.createChatCompletion(config, req);
    if (resp.choices.size() == 0) {
      Runtime.trap("Inference returned no choices");
    };
    resp.choices[0].message.content
      ?? Runtime.trap("Inference returned no text content");
  };

  // ---------------------------------------------------------------------------
  // Minimal JSON extraction for the model's clip array
  // ---------------------------------------------------------------------------

  // Defensive bounds so a pathological model response cannot produce an
  // unbounded structure.
  let maxParsedClips : Nat = 20;
  let maxFieldChars : Nat = 2_000;
  let maxHashtags : Nat = 20;

  // Parse the model's JSON response into clips, clamping timestamps to the
  // requested maximum. Returns null when no clip can be recovered.
  //
  // Iterative and bounded: we locate the `"clips"` array and scan its
  // top-level `{...}` elements, so a large or deeply nested response can never
  // recurse. At most `maxParsedClips` clips are produced.
  func parseClips(text : Text, maxClipSeconds : Nat) : ?[RawClip] {
    let clips = List.empty<RawClip>();
    // Prefer the clips array; fall back to scanning the whole text so a bare
    // object or a differently-shaped reply still yields a clip.
    let scanText = switch (jsonValue(text, "clips")) {
      case (?v) v;
      case null text;
    };
    let chars = scanText.toArray();
    var depth = 0;
    var start = 0;
    var i = 0;
    while (i < chars.size() and clips.size() < maxParsedClips) {
      let c = chars[i];
      if (c == '{') {
        if (depth == 0) { start := i };
        depth += 1;
      } else if (c == '}') {
        if (depth > 0) {
          depth -= 1;
          if (depth == 0) {
            let block = slice(chars, start, i - start + 1);
            switch (parseClipObject(block, maxClipSeconds)) {
              case (?clip) { clips.add(clip) };
              case null {};
            };
          };
        };
      };
      i += 1;
    };
    if (clips.size() == 0) { null } else { ?clips.toArray() };
  };

  // Parse a single clip object. Requires startSeconds, endSeconds and title.
  func parseClipObject(block : Text, maxClipSeconds : Nat) : ?RawClip {
    let ?start = jsonNat(block, "startSeconds") else { return null };
    let ?end = jsonNat(block, "endSeconds") else { return null };
    let ?title = jsonText(block, "title") else { return null };
    if (end <= start) { return null };
    let clampedEnd = if (end - start > maxClipSeconds) { start + maxClipSeconds } else { end };
    ?{
      startSeconds = start;
      endSeconds = clampedEnd;
      title = truncateText(title, maxFieldChars);
      caption = truncateText(jsonText(block, "caption") ?? "", maxFieldChars);
      hashtags = jsonTextArray(block, "hashtags");
    };
  };

  // Read a numeric field value from a JSON object fragment.
  func jsonNat(block : Text, key : Text) : ?Nat {
    switch (jsonValue(block, key)) {
      case (?v) v.toNat();
      case null null;
    };
  };

  // Read a string field value from a JSON object fragment.
  func jsonText(block : Text, key : Text) : ?Text {
    switch (jsonValue(block, key)) {
      case (?v) {
        let t = v.trim(#predicate(func(c : Char) : Bool = c == ' '));
        if (t.startsWith(#text "\"")) {
          ?unescape(t.trimStart(#text "\"").trimEnd(#text "\""))
        } else { ?t };
      };
      case null null;
    };
  };

  // Read a string-array field value from a JSON object fragment.
  func jsonTextArray(block : Text, key : Text) : [Text] {
    let ?v = jsonValue(block, key) else { return [] };
    let t = v.trim(#predicate(func(c : Char) : Bool = c == ' '));
    if (not t.startsWith(#text "[")) { return [] };
    let inner = t.trimStart(#text "[").trimEnd(#text "]");
    let out = List.empty<Text>();
    for (part in inner.split(#predicate(func(c : Char) : Bool = c == ','))) {
      if (out.size() >= maxHashtags) { break };
      let p = part.trim(#predicate(func(c : Char) : Bool = c == ' '));
      if (p.size() > 0) {
        let cleaned = if (p.startsWith(#text "\"")) {
          unescape(p.trimStart(#text "\"").trimEnd(#text "\""))
        } else { p };
        out.add(truncateText(cleaned, maxFieldChars));
      };
    };
    out.toArray();
  };

  // Locate `"key"` and return the raw value text up to the next top-level comma
  // or closing brace. Handles nested arrays/objects one level deep.
  func jsonValue(block : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\"";
    let ?afterKey = findAfter(block, needle) else { return null };
    // Skip the colon and whitespace.
    let trimmed = afterKey.trimStart(#predicate(func(c : Char) : Bool = c == ' ' or c == ':'));
    if (trimmed.size() == 0) { return null };
    let chars = trimmed.toArray();
    let first = chars[0];
    if (first == '[') {
      // Read to the matching ']', skipping quoted strings so a ']' inside a
      // caption does not close the array early.
      var depth = 0;
      var i = 0;
      while (i < chars.size()) {
        let c = chars[i];
        if (c == '\"') {
          // Skip the whole string literal.
          i += 1;
          while (i < chars.size() and chars[i] != '\"') {
            if (chars[i] == '\\') { i += 2 } else { i += 1 };
          };
        } else if (c == '[') {
          depth += 1;
        } else if (c == ']') {
          depth -= 1;
          if (depth == 0) { return ?slice(chars, 0, i + 1) };
        };
        i += 1;
      };
      null;
    } else if (first == '\"') {
      // Read to the closing quote, skipping backslash-escaped characters so an
      // embedded `\"` (the model's content is itself JSON) does not end the
      // string early.
      var i = 1;
      while (i < chars.size()) {
        if (chars[i] == '\\') {
          i += 2;
        } else if (chars[i] == '\"') {
          return ?slice(chars, 0, i + 1);
        } else {
          i += 1;
        };
      };
      null;
    } else {
      // Bare token: read to the next ',' or '}'.
      var i = 0;
      while (i < chars.size()) {
        if (chars[i] == ',' or chars[i] == '}') {
          return ?slice(chars, 0, i);
        };
        i += 1;
      };
      ?Text.fromArray(chars);
    };
  };

  // Return the substring that follows the first occurrence of `needle`.
  func findAfter(haystack : Text, needle : Text) : ?Text {
    let h = haystack.toArray();
    let n = needle.toArray();
    if (n.size() == 0 or h.size() < n.size()) { return null };
    var i = 0;
    while (i + n.size() <= h.size()) {
      var match = true;
      var j = 0;
      while (j < n.size()) {
        if (h[i + j] != n[j]) { match := false; break };
        j += 1;
      };
      if (match) {
        return ?slice(h, i + n.size(), h.size() - i - n.size());
      };
      i += 1;
    };
    null;
  };

  // Resolve the common JSON string escapes.
  func unescape(text : Text) : Text {
    text.replace(#text "\\\"", "\"").replace(#text "\\n", "\n").replace(#text "\\\\", "\\");
  };

  // Render an aspect ratio as a stable text label for OQL.
  public func aspectRatioText(ratio : Types.AspectRatio) : Text {
    switch (ratio) {
      case (#portrait) "9:16";
      case (#square) "1:1";
      case (#landscape) "16:9";
    };
  };

  // ---------------------------------------------------------------------------
  // Plan persistence
  // ---------------------------------------------------------------------------

  // Generate a clip plan from a YouTube URL plus the chosen options.
  public func generatePlan(
    transform : OutCall.Transform,
    plans : Map.Map<Types.PlanId, Types.ClipPlan>,
    state : { var nextPlanId : Nat },
    caller : Principal,
    request : Types.GeneratePlanRequest,
  ) : async* Types.GeneratePlanResult {
    let ?videoId = parseVideoId(request.url) else {
      return #err(#invalidUrl("Tautan YouTube tidak valid. Gunakan format watch, youtu.be, Shorts, atau embed."));
    };

    let ?transcript = await fetchTranscript(transform, videoId) else {
      return #err(#noCaptions("Video ini tidak memiliki transkrip/caption yang bisa dibaca, atau tidak dapat dijangkau."));
    };

    let ?rawClips = await* selectClips(transcript, request.options) else {
      return #err(#aiFailure("AI gagal menganalisis transkrip video ini. Coba lagi."));
    };

    let clips = rawClips.map(
      func(c) {
        {
          index = 0; // assigned below
          startSeconds = c.startSeconds;
          endSeconds = c.endSeconds;
          title = c.title;
          caption = c.caption;
          hashtags = c.hashtags;
        };
      },
    );
    // Assign 0-based indices.
    let indexed = List.tabulate<Types.Clip>(
      clips.size(),
      func(i) = { clips[i] with index = i },
    ).toArray();

    let id = state.nextPlanId;
    state.nextPlanId := id + 1;
    let now = Time.now();
    let plan : Types.ClipPlan = {
      id;
      owner = caller;
      name = transcript.title # " — " # now.toText();
      createdAt = now;
      sourceUrl = request.url;
      sourceTitle = transcript.title;
      channel = transcript.channel;
      durationSeconds = transcript.durationSeconds;
      language = transcript.language;
      maxClipSeconds = request.options.maxClipSeconds;
      aspectRatio = request.options.aspectRatio;
      subtitlesEnabled = request.options.subtitlesEnabled;
      clips = indexed;
    };
    plans.add(id, plan);
    #ok(plan);
  };

  // List every saved plan owned by the caller, newest first.
  public func listPlans(
    plans : Map.Map<Types.PlanId, Types.ClipPlan>,
    caller : Principal,
  ) : [Types.ClipPlan] {
    let owned = plans.values().filter(func(p) = Principal.equal(p.owner, caller)).toArray();
    owned.sort(func(a, b) = Int.compare(b.createdAt, a.createdAt));
  };

  // Read a single saved plan by id, scoped to the caller.
  public func getPlan(
    plans : Map.Map<Types.PlanId, Types.ClipPlan>,
    caller : Principal,
    id : Types.PlanId,
  ) : ?Types.ClipPlan {
    switch (plans.get(id)) {
      case (?plan) { if (Principal.equal(plan.owner, caller)) { ?plan } else { null } };
      case null { null };
    };
  };

  // Delete a saved plan by id. Returns true when a plan was removed.
  public func deletePlan(
    plans : Map.Map<Types.PlanId, Types.ClipPlan>,
    caller : Principal,
    id : Types.PlanId,
  ) : Bool {
    switch (plans.get(id)) {
      case (?plan) {
        if (Principal.equal(plan.owner, caller)) {
          plans.remove(id);
          true;
        } else { false };
      };
      case null { false };
    };
  };
};
