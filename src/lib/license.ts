import "server-only";
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";
import { createAdminClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

// Licence tokens are signed with an ES256 private key on the server.
// The panel ships the matching public key, so it can check a token offline
// for up to OFFLINE_GRACE_DAYS without reaching the server.

const ALG = "ES256";
const ISSUER = "postkit";
const OFFLINE_GRACE_DAYS = 7;

export type LicenseClaims = {
  sub: string; // user id
  dev: string; // device id
  plan: string;
  planExpires: string; // ISO date the paid term ends
};

export type Device = { hash: string; name?: string; platform?: "win" | "mac" };

export class LicenseError extends Error {
  constructor(
    public code: "no_plan" | "plan_expired" | "device_limit" | "device_removed" | "bad_token",
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function activeSubscription(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("plan, expires_at, devices_allowed")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new LicenseError("no_plan", 402, "No plan on this account.");
  if (new Date(data.expires_at) <= new Date()) {
    throw new LicenseError("plan_expired", 402, "Your plan has ended. Renew it from your account.");
  }
  return data as { plan: string; expires_at: string; devices_allowed: number };
}

/** Registers (or refreshes) a device for a user, enforcing the device limit. */
export async function registerDevice(userId: string, device: Device) {
  const sub = await activeSubscription(userId);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_hash", device.hash)
    .maybeSingle();

  if (existing) {
    await admin
      .from("devices")
      .update({ last_seen_at: new Date().toISOString(), name: device.name ?? null })
      .eq("id", existing.id);
    return { deviceId: existing.id as string, sub };
  }

  const { count } = await admin
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= sub.devices_allowed) {
    throw new LicenseError(
      "device_limit",
      409,
      "This plan is already active on another computer. Remove it from your account page, then try again.",
    );
  }

  const { data: created, error } = await admin
    .from("devices")
    .insert({
      user_id: userId,
      device_hash: device.hash,
      name: device.name ?? null,
      platform: device.platform ?? null,
    })
    .select("id")
    .single();
  if (error || !created) throw new LicenseError("bad_token", 500, "Could not register this computer.");
  return { deviceId: created.id as string, sub };
}

export async function issueToken(userId: string, deviceId: string, sub: { plan: string; expires_at: string }) {
  const key = await importPKCS8(serverEnv.licensePrivateKey(), ALG);
  const planEnds = Math.floor(new Date(sub.expires_at).getTime() / 1000);
  const graceEnds = Math.floor(Date.now() / 1000) + OFFLINE_GRACE_DAYS * 86_400;

  const token = await new SignJWT({ dev: deviceId, plan: sub.plan, planExpires: sub.expires_at })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.min(planEnds, graceEnds))
    .sign(key);

  return { token, planExpires: sub.expires_at };
}

/** Re-checks a token against the database and returns a fresh one. */
export async function refreshToken(token: string) {
  const key = await importSPKI(serverEnv.licensePublicKey(), ALG);
  let claims: LicenseClaims;
  try {
    // Accept tokens up to the grace window past expiry, so a panel that was
    // offline a little too long can still refresh instead of signing in again.
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      clockTolerance: OFFLINE_GRACE_DAYS * 86_400,
    });
    claims = payload as unknown as LicenseClaims;
  } catch {
    throw new LicenseError("bad_token", 401, "Sign in again.");
  }

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("devices")
    .select("id")
    .eq("id", claims.dev)
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (!device) {
    throw new LicenseError("device_removed", 401, "This computer was removed from your account. Sign in again.");
  }

  const sub = await activeSubscription(claims.sub);
  await admin.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", claims.dev);
  return issueToken(claims.sub, claims.dev, sub);
}

export async function creditBalance(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  return (data?.balance as number | undefined) ?? 0;
}
