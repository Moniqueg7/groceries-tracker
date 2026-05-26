/**
 * HTTPS fetch for retailer sites. Enables the system CA store on Node 22+ when
 * --use-system-ca was not passed (e.g. some IDE terminal setups).
 */
export async function storeFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof process !== "undefined" && !process.env.NODE_OPTIONS?.includes("use-system-ca")) {
    process.env.NODE_USE_SYSTEM_CA = "1";
  }

  return fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json",
      "Accept-Language": "en-ZA,en;q=0.9",
      ...init?.headers,
    },
  });
}
