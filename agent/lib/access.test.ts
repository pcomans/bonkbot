import { describe, expect, it } from "vitest";
import { appAccessAllowed } from "./access";

describe("appAccessAllowed", () => {
  it("allows local development", () => {
    expect(appAccessAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("stays closed in production unless the deployment is marked as protected", () => {
    expect(appAccessAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(appAccessAllowed({ NODE_ENV: "production", BONKBOT_DEPLOYMENT_PROTECTED: "true" })).toBe(false);
    expect(appAccessAllowed({ NODE_ENV: "production", BONKBOT_DEPLOYMENT_PROTECTED: "1" })).toBe(true);
  });
});
