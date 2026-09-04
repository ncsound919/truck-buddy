/**
 * Supabase auth integration for Truck Buddy portal.
 * 
 * Uses Supabase Auth for:
 * - User sign-up/sign-in (email/password, magic link, OAuth)
 * - Session management with auto-refresh
 * - Row-level security (RLS) for org-scoped data
 * - Real-time subscriptions for live updates
 * 
 * The portal uses Supabase as the auth provider while keeping the 
 * existing mock store for operational data during the transition.
 */

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

/**
 * Client-side Supabase client (for use in React components).
 * Handles session persistence and auto-refresh.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Get the current user on the client.
 * Returns null if no active session.
 */
export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) return null;
  return user;
}

/**
 * Get the current session on the client.
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user session with org context.
 * Combines Supabase user with the mock portal's org membership.
 */
export async function getSessionWithOrg() {
  const session = await getSession();
  
  if (!session?.user) return null;

  // Fetch org membership from the portal mock store
  const membershipRes = await fetch("/api/portal/orgs", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!membershipRes.ok) return null;

  const membership = await membershipRes.json();

  return {
    user: session.user,
    accessToken: session.access_token,
    membership,
  };
}

/**
 * Sign up with email/password.
 */
export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/portal`,
    },
  });
  return { data, error };
}

/**
 * Sign in with email/password.
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign in with magic link (passwordless).
 */
export async function signInWithMagicLink(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/portal`,
    },
  });
  return { data, error };
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.).
 */
export async function signInWithOAuth(provider: "google" | "github") {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/portal`,
    },
  });
  return { data, error };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Reset password flow.
 */
export async function resetPassword(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/portal/reset-password`,
  });
  return { data, error };
}

/**
 * Update user password (after reset).
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

/**
 * Get the user's subscription tier from the org membership.
 * Maps org tier to Supabase custom claim for RLS policies.
 */
export function getSubscriptionTier(membership: { org: { tier: string } } | null): "basic" | "pro" | "enterprise" | null {
  if (!membership) return null;
  return membership.org.tier as "basic" | "pro" | "enterprise";
}

/**
 * Check if user has access to a feature based on tier.
 */
export function canAccessFeature(
  tier: "basic" | "pro" | "enterprise" | null,
  feature: "unlimited_loads" | "advanced_analytics" | "fmcsa_checks" | "api_access" | "team_management"
): boolean {
  if (!tier) return false;
  
  const features: Record<string, string[]> = {
    basic: [],
    pro: ["unlimited_loads", "advanced_analytics", "fmcsa_checks", "team_management"],
    enterprise: ["unlimited_loads", "advanced_analytics", "fmcsa_checks", "api_access", "team_management"],
  };
  
  return features[tier]?.includes(feature) ?? false;
}