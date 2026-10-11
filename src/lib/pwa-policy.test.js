import { describe, expect, test } from "bun:test";
import { isAppWorker, shouldRegisterAppWorker } from "./pwa-policy";

const published = { production: true, framed: false, hostname: "benang-merah.lovable.app", search: "" };
describe("offline app safety", () => {
  test("published top-level app can register for offline use", () => {
    expect(shouldRegisterAppWorker(published)).toBe(true);
  });
  test("development and embedded previews never register", () => {
    expect(shouldRegisterAppWorker({ ...published, production: false })).toBe(false);
    expect(shouldRegisterAppWorker({ ...published, framed: true })).toBe(false);
  });
  test("every Lovable preview hostname refuses registration", () => {
    for (const hostname of ["id-preview--abc.lovable.app", "preview--abc.lovable.app", "lovableproject.com", "abc.lovableproject.com", "lovableproject-dev.com", "abc.lovableproject-dev.com", "beta.lovable.dev", "abc.beta.lovable.dev"]) {
      expect(shouldRegisterAppWorker({ ...published, hostname })).toBe(false);
    }
  });
  test("kill switch disables offline registration", () => {
    expect(shouldRegisterAppWorker({ ...published, search: "?sw=off" })).toBe(false);
  });
  test("cleanup matches only the same-origin app worker, not messaging workers", () => {
    expect(isAppWorker("https://example.com/sw.js", "https://example.com")).toBe(true);
    expect(isAppWorker("https://example.com/firebase-messaging-sw.js", "https://example.com")).toBe(false);
    expect(isAppWorker("https://other.com/sw.js", "https://example.com")).toBe(false);
  });
});