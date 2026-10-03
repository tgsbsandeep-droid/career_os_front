import type { User } from "@supabase/supabase-js";
import { supabase, apiRequest } from "./api";

export const VALID_ROLES = ["candidate", "academy", "recruiter", "admin"] as const;
export type AppRole = (typeof VALID_ROLES)[number];
export const SIGNUP_ROLES = ["candidate", "academy", "recruiter"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

const ROLE_ALIASES: Record<string, AppRole> = {
  tutor: "academy",
  instructor: "academy",
  training_institute: "candidate",
  college: "candidate",
  student: "candidate",
  employer: "recruiter",
};

const DASHBOARD_PATH: Record<AppRole, string> = {
  academy: "/academy/dashboard",
  recruiter: "/recruiter/dashboard",
  admin: "/admin/dashboard",
  candidate: "/candidate/dashboard",
};

const ROLE_LABELS: Record<AppRole, string> = {
  candidate: "Candidate",
  academy: "Academy",
  recruiter: "Recruiter",
  admin: "Admin",
};

let cachedUser: User | null = null;
let sessionReady = false;
// When setActiveRole patches cachedUser, the next onAuthStateChange event may
// arrive with a JWT that still carries the old active_role (Supabase re-issues
// the token asynchronously). We keep the intended role here and apply it on top
// of whatever onAuthStateChange delivers, until the JWT itself reflects it.
let pendingActiveRole: AppRole | null = null;
const sessionListeners = new Set<(user: User | null) => void>();

supabase.auth.onAuthStateChange((_event, session) => {
  const incoming = session?.user ?? null;
  if (incoming && pendingActiveRole) {
    const jwtRole = aliasRole(
      (incoming.user_metadata as Record<string, unknown> | undefined)?.active_role,
    );
    if (jwtRole === pendingActiveRole) {
      // JWT now reflects the switch — clear the pending override.
      pendingActiveRole = null;
      cachedUser = incoming;
    } else {
      // JWT is still stale — keep our patch in place.
      cachedUser = {
        ...incoming,
        user_metadata: {
          ...(incoming.user_metadata as Record<string, unknown>),
          active_role: pendingActiveRole,
          role: pendingActiveRole,
        },
      };
    }
  } else {
    cachedUser = incoming;
  }
  sessionReady = true;
  sessionListeners.forEach((listener) => listener(cachedUser));
});

void supabase.auth.getSession().then(({ data }) => {
  const incoming = data.session?.user ?? null;
  if (incoming && pendingActiveRole) {
    const jwtRole = aliasRole(
      (incoming.user_metadata as Record<string, unknown> | undefined)?.active_role,
    );
    cachedUser = jwtRole === pendingActiveRole
      ? (pendingActiveRole = null, incoming)
      : {
          ...incoming,
          user_metadata: {
            ...(incoming.user_metadata as Record<string, unknown>),
            active_role: pendingActiveRole,
            role: pendingActiveRole,
          },
        };
  } else {
    cachedUser = incoming;
  }
  sessionReady = true;
  sessionListeners.forEach((listener) => listener(cachedUser));
});

export function subscribeToUser(listener: (user: User | null) => void) {
  sessionListeners.add(listener);
  if (sessionReady) listener(cachedUser);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getCachedUser() {
  return cachedUser;
}

export function isSessionReady() {
  return sessionReady;
}

export function aliasRole(raw: unknown): AppRole | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  const mapped = ROLE_ALIASES[value] ?? value;
  return (VALID_ROLES as readonly string[]).includes(mapped) ? (mapped as AppRole) : null;
}

function uniqueRoles(values: unknown[]): AppRole[] {
  const seen = new Set<AppRole>();
  for (const value of values) {
    const role = aliasRole(value);
    if (role) seen.add(role);
  }
  return [...seen];
}

export function sanitizeSignupRoles(values: unknown[]): AppRole[] {
  const seen = new Set<AppRole>();
  for (const value of values) {
    const role = aliasRole(value);
    if (!role || role === "admin") continue;
    if (!(SIGNUP_ROLES as readonly string[]).includes(role)) continue;
    seen.add(role);
  }
  return [...seen];
}

export function requireSingleSignupRole(values: unknown[]): AppRole {
  const cleaned = sanitizeSignupRoles(values);
  if (!cleaned.length) {
    throw new Error("Select one role: candidate, academy, or recruiter.");
  }
  if (cleaned.length > 1) {
    throw new Error("Select only one role at a time. Extra roles can be added later after confirmation.");
  }
  return cleaned[0];
}

function appMetadataHasAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  return uniqueRoles([
    ...(Array.isArray(app.roles) ? app.roles : []),
    app.role,
  ]).includes("admin");
}

export function getUserRoles(user: User | null | undefined): AppRole[] {
  if (!user) return [];
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const fromArray = Array.isArray(meta.roles) ? meta.roles : Array.isArray(app.roles) ? app.roles : [];
  const fromSingle = [meta.role, app.role, meta.active_role];
  const roles = uniqueRoles([...fromArray, ...fromSingle]);
  if (appMetadataHasAdmin(user)) return roles;
  return roles.filter((role) => role !== "admin");
}

export function getUserRole(user: User | null | undefined): AppRole {
  if (!user) return "candidate";
  const roles = getUserRoles(user);
  const active = aliasRole((user.user_metadata as Record<string, unknown> | undefined)?.active_role)
    ?? aliasRole((user.user_metadata as Record<string, unknown> | undefined)?.role);
  if (active && roles.includes(active)) return active;
  return roles[0] ?? "candidate";
}

export function hasRole(user: User | null | undefined, allowed: string[]): boolean {
  const roles = getUserRoles(user);
  return allowed.some((value) => {
    const mapped = aliasRole(value);
    return mapped ? roles.includes(mapped) : false;
  });
}

export function getDashboardPath(user: User | null | undefined, role?: string) {
  const chosen = aliasRole(role) ?? getUserRole(user);
  return DASHBOARD_PATH[chosen] ?? DASHBOARD_PATH.candidate;
}

export function getRoleLabel(role: string) {
  return ROLE_LABELS[aliasRole(role) ?? "candidate"];
}

export function getAuthRedirectTo(path = "/auth/callback") {
  return `${window.location.origin}${path}`;
}

export function getSupabaseAuthProvidersUrl() {
  const raw = String(import.meta.env.VITE_SUPABASE_URL ?? "");
  try {
    const host = new URL(raw).hostname;
    const ref = host.endsWith(".supabase.co") ? host.split(".")[0] : "";
    if (ref && ref !== "your-project") return `https://supabase.com/dashboard/project/${ref}/auth/providers`;
  } catch {
    /* ignore malformed env */
  }
  return "https://supabase.com/dashboard/project/_/auth/providers";
}

export function mapAuthError(error: unknown, provider?: "google" | "linkedin" | "phone") {
  const err = error as { message?: string; code?: string } | null;
  const message = String(err?.message ?? error ?? "Sign-in failed");
  const code = String(err?.code ?? "").toLowerCase();
  const lower = message.toLowerCase();
  const phoneDisabled =
    code === "phone_provider_disabled" ||
    lower.includes("unsupported phone provider") ||
    lower.includes("phone provider is not enabled") ||
    lower.includes("phone_provider_disabled") ||
    ((provider === "phone" || lower.includes("phone")) && (
      lower.includes("provider is not enabled") ||
      lower.includes("unsupported provider") ||
      lower.includes("provider disabled")
    ));
  if (phoneDisabled) {
    return `Phone OTP is not enabled on this Supabase project. Open Authentication → Providers (${getSupabaseAuthProvidersUrl()}), enable Phone, and connect an SMS provider (Twilio, MessageBird, or Vonage). Until then, sign in with email.`;
  }
  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider") || code.endsWith("_provider_disabled")) {
    const label = provider === "linkedin" ? "LinkedIn" : "Google";
    return `${label} is not enabled on this Supabase project. Open Authentication → Providers (${getSupabaseAuthProvidersUrl()}), enable ${label}, then add redirect URL ${getAuthRedirectTo()}.`;
  }
  if (lower.includes("redirect") && (lower.includes("not allowed") || lower.includes("whitelist"))) {
    return `This app origin is not in the Supabase redirect allow-list. Add ${getAuthRedirectTo()} under Authentication → URL Configuration.`;
  }
  return message;
}

export function normalizePhone(input: string) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return digits ? `+${digits.replace(/^\+/, "")}` : "";
}

// The profiles.role check constraint only allows:
//   ('candidate', 'tutor', 'recruiter', 'employer', 'admin')
// Map frontend canonical names to DB-compatible values before writing.
function toDbRole(r: AppRole): string {
  if (r === "academy") return "tutor";
  return r;
}

export async function persistProfile(user: User, extras: { full_name?: string; roles: AppRole[]; active_role?: AppRole }) {
  const publicRoles = sanitizeSignupRoles(extras.roles);
  const held = sanitizeSignupRoles(getUserRoles(user));
  const added = publicRoles.filter((role) => !held.includes(role));
  if (held.length === 0 && publicRoles.length > 1) {
    throw new Error("Choose one starting role. Extra roles can be added later after confirmation.");
  }
  if (held.length > 0 && added.length > 1) {
    throw new Error("Add one extra role at a time and confirm it first.");
  }
  const isAdmin = appMetadataHasAdmin(user);
  if (!publicRoles.length && !isAdmin) {
    throw new Error("Select one role: candidate, academy, or recruiter.");
  }
  const roles = isAdmin ? uniqueRoles([...publicRoles, "admin"]) : publicRoles;
  const active = extras.active_role && roles.includes(extras.active_role)
    ? extras.active_role
    : (publicRoles[0] ?? (isAdmin ? "admin" : "candidate"));
  const fullName = extras.full_name
    || String((user.user_metadata as Record<string, unknown> | undefined)?.full_name ?? "")
    || user.email?.split("@")[0]
    || "";

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      role: active,
      roles,
      active_role: active,
    },
  });
  if (metaError) throw metaError;

  const dbRoles = roles.map(toDbRole);
  const profileRow = {
    id: user.id,
    full_name: fullName,
    role: toDbRole(active),
    status: "active",
    updated_at: new Date().toISOString(),
  };
  const withRoles = await supabase.from("profiles").upsert({ ...profileRow, roles: dbRoles });
  if (withRoles.error) {
    const { error } = await supabase.from("profiles").upsert(profileRow);
    if (error) throw error;
  }

  return { roles, active };
}

export async function setActiveRole(role: string) {
  const mapped = aliasRole(role);
  if (!mapped) throw new Error("Invalid role");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  if (mapped === "admin" && !appMetadataHasAdmin(data.user)) {
    throw new Error("Admin access cannot be self-assigned");
  }
  const roles = getUserRoles(data.user);
  if (!roles.includes(mapped)) throw new Error("You do not have that role yet");

  // Set pendingActiveRole BEFORE calling updateUser so that the USER_UPDATED
  // onAuthStateChange event (which fires during the await) doesn't overwrite
  // cachedUser with the stale JWT before we get a chance to patch it.
  pendingActiveRole = mapped;

  // Lightweight: only update active_role in auth metadata. The full role list
  // is unchanged when switching, so we don't need to rewrite it.
  const { error: metaError } = await supabase.auth.updateUser({
    data: { active_role: mapped, role: mapped },
  });
  if (metaError) {
    pendingActiveRole = null; // roll back on failure
    throw metaError;
  }

  // Patch cachedUser immediately so RoleSwitcher and ProtectedRoute see the
  // correct active_role right away.
  const patchedUser: typeof data.user = {
    ...data.user,
    user_metadata: {
      ...(data.user.user_metadata as Record<string, unknown>),
      active_role: mapped,
      role: mapped,
    },
  };
  cachedUser = patchedUser;
  sessionListeners.forEach((listener) => listener(cachedUser));

  // Best-effort: sync profiles.role to the DB. A failure here does not block
  // the switch — the auth metadata is already updated.
  supabase
    .from("profiles")
    .update({ role: toDbRole(mapped), updated_at: new Date().toISOString() })
    .eq("id", data.user.id)
    .then(({ error: dbErr }) => {
      if (dbErr) console.warn("[setActiveRole] profiles sync failed:", dbErr.message);
    });

  return patchedUser;
}

export async function addUserRoles(extra: AppRole[], fullName?: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  const incoming = [requireSingleSignupRole(extra)];
  const current = sanitizeSignupRoles(getUserRoles(data.user));
  const already = incoming.filter((role) => current.includes(role));
  const added = incoming.filter((role) => !current.includes(role));
  if (!added.length) {
    throw new Error(already.length ? "That role is already on this account." : "Select a new role to add.");
  }
  const roles = uniqueRoles([...current, ...added, ...(appMetadataHasAdmin(data.user) ? (["admin"] as AppRole[]) : [])]);
  const newActiveRole = added[0] ?? getUserRole(data.user);
  await persistProfile(data.user, { full_name: fullName, roles, active_role: newActiveRole });
  const addPatchedUser: typeof data.user = {
    ...data.user,
    user_metadata: {
      ...(data.user.user_metadata as Record<string, unknown>),
      active_role: newActiveRole,
      role: newActiveRole,
    },
  };
  cachedUser = addPatchedUser;
  sessionListeners.forEach((listener) => listener(cachedUser));
  void supabase.auth.refreshSession();
  return addPatchedUser;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getAuthRedirectTo(), queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
}

export async function signInWithLinkedIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: getAuthRedirectTo() },
  });
  if (error) throw error;
}

export async function sendPhoneOtp(phone: string) {
  const normalized = normalizePhone(phone);
  if (!/^\+\d{10,15}$/.test(normalized)) {
    throw new Error("Enter a valid mobile number with country code.");
  }
  const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
  if (error) throw error;
  return normalized;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: token.trim(),
    type: "sms",
  });
  if (error) throw error;
  return data.user ?? data.session?.user ?? null;
}

export function needsRoleSelection(user: User | null | undefined) {
  if (!user) return false;
  if (appMetadataHasAdmin(user)) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const fromArray = Array.isArray(meta.roles) ? meta.roles : Array.isArray(app.roles) ? app.roles : [];
  const raw = [...fromArray, meta.role, app.role, meta.active_role];
  return sanitizeSignupRoles(raw).length === 0;
}

export function isPasswordRecoveryRedirect() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = (search.get("type") || hash.get("type") || "").toLowerCase();
  return type === "recovery";
}

export async function requestPasswordReset(email: string) {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Enter the email address for your account.");
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: getAuthRedirectTo("/auth/reset-password"),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const next = password.trim();
  if (next.length < 8) throw new Error("Password must be at least 8 characters.");
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Backend-proxied auth — all Supabase calls go through /api/auth/* so the
// Supabase keys are never needed in the browser for auth operations.
// ---------------------------------------------------------------------------

type AuthApiSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
};

type AuthApiUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

type SignUpApiResponse = {
  success: boolean;
  user: AuthApiUser | null;
  session: AuthApiSession | null;
  email_confirmation_required: boolean;
};

type SignInApiResponse = {
  success: boolean;
  user: AuthApiUser;
  session: AuthApiSession;
};

/**
 * Sign up via backend /api/auth/signup.
 * Returns { user, session, emailConfirmationRequired }.
 * After success, sets the Supabase session locally so the rest of the app
 * (which still uses supabase.auth.getSession()) picks up the JWT.
 */
export async function signUpViaApi(params: {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
  roles: AppRole[];
  active_role: AppRole;
}): Promise<{ user: AuthApiUser | null; session: AuthApiSession | null; emailConfirmationRequired: boolean }> {
  const data = await apiRequest<SignUpApiResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // If a session was returned, set it in the local Supabase client so
  // onAuthStateChange fires and the rest of the app sees the logged-in user.
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return {
    user: data.user,
    session: data.session,
    emailConfirmationRequired: data.email_confirmation_required,
  };
}

/**
 * Sign in via backend /api/auth/login.
 * Sets the Supabase session locally after success.
 */
export async function signInViaApi(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthApiUser; session: AuthApiSession }> {
  const data = await apiRequest<SignInApiResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // Hydrate the local Supabase client with the returned session.
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return { user: data.user, session: data.session };
}

/**
 * Sign out via backend /api/auth/logout.
 */
export async function signOutViaApi(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { /* best-effort */ });
  }
  // Always clear local session regardless of backend response.
  await supabase.auth.signOut();
}
