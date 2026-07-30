import * as assert from "node:assert/strict";
import {
  WIDGET_LAYOUT_PROFILES,
  DEFAULT_WIDGET_LAYOUT_PROFILE_ID,
  isKnownProfileId,
  resolveProfileId,
  getWidgetLayoutStorageKey,
} from "./widget-layout-profile-utils";

const runAssertions = () => {
  // There should be at least a default profile, and it should be known.
  assert.ok(WIDGET_LAYOUT_PROFILES.length > 0);
  assert.ok(isKnownProfileId(DEFAULT_WIDGET_LAYOUT_PROFILE_ID));

  // Known profile ids resolve to themselves.
  assert.equal(resolveProfileId("engineering"), "engineering");
  assert.equal(isKnownProfileId("engineering"), true);

  // Unknown / missing profile ids fall back to the default.
  assert.equal(
    resolveProfileId("not-a-real-profile"),
    DEFAULT_WIDGET_LAYOUT_PROFILE_ID,
  );
  assert.equal(resolveProfileId(null), DEFAULT_WIDGET_LAYOUT_PROFILE_ID);
  assert.equal(resolveProfileId(undefined), DEFAULT_WIDGET_LAYOUT_PROFILE_ID);
  assert.equal(isKnownProfileId(""), false);
  assert.equal(isKnownProfileId(null), false);

  // Storage keys are namespaced per profile, and fall back safely.
  assert.equal(
    getWidgetLayoutStorageKey("engineering"),
    "dashboard-widget-layout:engineering",
  );
  assert.equal(
    getWidgetLayoutStorageKey("bogus"),
    `dashboard-widget-layout:${DEFAULT_WIDGET_LAYOUT_PROFILE_ID}`,
  );
  assert.equal(
    getWidgetLayoutStorageKey(undefined),
    `dashboard-widget-layout:${DEFAULT_WIDGET_LAYOUT_PROFILE_ID}`,
  );

  // Two different profiles never collide on the same storage key.
  const keys = new Set(
    WIDGET_LAYOUT_PROFILES.map((p) => getWidgetLayoutStorageKey(p.id)),
  );
  assert.equal(keys.size, WIDGET_LAYOUT_PROFILES.length);
};

runAssertions();
console.log(
  "widget-layout-profile-utils.test.ts: all structural assertions passed",
);
