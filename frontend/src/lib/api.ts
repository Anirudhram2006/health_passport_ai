const TIMEOUT_MS = 25000;

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    // Use relative origin /api when on ngrok, localtunnel, or non-localhost domain to route through Next.js proxy rewrite
    if (
      hostname.includes("ngrok") ||
      hostname.includes("loca.lt") ||
      hostname.includes("tunnel") ||
      (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost"))
    ) {
      return `${origin}/api`;
    }

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${window.location.protocol}//${hostname}:5000/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("hpa_token") : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}
