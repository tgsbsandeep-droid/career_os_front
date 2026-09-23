import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const LIVE_API_URL = "https://career-os-back.onrender.com";

const API_BASE = String(
  import.meta.env.VITE_API_URL
  ?? (import.meta.env.PROD ? LIVE_API_URL : ""),
).trim().replace(/\/$/, "");

function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${suffix}` : suffix;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), { ...options, headers });
  } catch {
    throw new Error(
      API_BASE
        ? `Cannot reach the API at ${API_BASE}. The server may be waking up — please wait 30 seconds and try again.`
        : "Cannot reach the API server. Set VITE_API_URL (local: http://localhost:5000).",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.status === 404) {
      throw new Error(`API route not found: ${path}. Make sure the API server is running.`);
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error("API server is not running. Start it with npm run dev from the project root.");
    }
    throw new Error(`API returned an unexpected response (${response.status}). Make sure the API server is running.`);
  }

  const payload = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

export { supabase };
