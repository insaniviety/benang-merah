import { isAppWorker, shouldRegisterAppWorker } from "./pwa-policy";

// The only app-shell registration entry point. Messaging workers are untouched.
export async function registerAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const allowed = shouldRegisterAppWorker({
    production: import.meta.env.PROD,
    framed: window.self !== window.top,
    hostname: window.location.hostname,
    search: window.location.search,
  });
  if (!allowed) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) =>
      [registration.active, registration.waiting, registration.installing]
        .some((worker) => worker && isAppWorker(worker.scriptURL, window.location.origin)),
    ).map((registration) => registration.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}