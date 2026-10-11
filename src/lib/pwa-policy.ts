export function shouldRegisterAppWorker({
  production, framed, hostname, search,
}: { production: boolean; framed: boolean; hostname: string; search: string }) {
  const previewDomains = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  return production && !framed
    && !hostname.startsWith("id-preview--") && !hostname.startsWith("preview--")
    && !previewDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
    && new URLSearchParams(search).get("sw") !== "off";
}

export function isAppWorker(scriptURL: string, origin: string) {
  const url = new URL(scriptURL, origin);
  return url.origin === origin && url.pathname === "/sw.js";
}