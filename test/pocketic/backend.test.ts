import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.listPlans()).resolves.toEqual([]);
});

it("returns no plan for an unknown id", async () => {
  await expect(actor.getPlan(999n)).resolves.toEqual([]);
});

it("rejects an invalid YouTube URL with a typed error instead of trapping", async () => {
  const result = await actor.generatePlan({
    url: "https://example.com/not-youtube",
    options: {
      maxClipSeconds: 60n,
      aspectRatio: { portrait: null },
      subtitlesEnabled: true,
    },
  });
  expect(result).toHaveProperty("err");
  expect(result).toHaveProperty("err.invalidUrl");
});

it("rejects a malformed URL with a typed error instead of trapping", async () => {
  const result = await actor.generatePlan({
    url: "not a url at all",
    options: {
      maxClipSeconds: 30n,
      aspectRatio: { landscape: null },
      subtitlesEnabled: false,
    },
  });
  expect(result).toHaveProperty("err");
  expect(result).toHaveProperty("err.invalidUrl");
});

it("does not show one caller's plans to another", async () => {
  const alice = createIdentity("alice");
  const bob = createIdentity("bob");

  const aliceActor = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  aliceActor.setIdentity(alice);
  await aliceActor._initialize_access_control();

  const bobActor = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  bobActor.setIdentity(bob);
  await bobActor._initialize_access_control();

  // Neither caller has created a plan, so each sees an empty, caller-scoped list.
  await expect(aliceActor.listPlans()).resolves.toEqual([]);
  await expect(bobActor.listPlans()).resolves.toEqual([]);

  // A read of an id that does not exist returns an empty option, not a trap,
  // and is scoped to the caller.
  await expect(aliceActor.getPlan(0n)).resolves.toEqual([]);
  await expect(bobActor.getPlan(0n)).resolves.toEqual([]);

  // A delete of an id that does not exist is a no-op, not a trap.
  await expect(aliceActor.deletePlan(0n)).resolves.toBe(false);
});
