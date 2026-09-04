"use client";

import { useEffect, useState } from "react";

export type OrgRole = "owner" | "admin" | "dispatcher" | "driver" | "accountant";
export type OrgKind = "independent" | "fleet" | "carrier" | "shipper" | "broker";
export type OrgTier = "basic" | "pro" | "enterprise";
export type EquipmentId = "box_truck" | "hotshot" | "dry_van" | "reefer" | "flatbed" | "tanker";

export interface Organization {
  id: string;
  name: string;
  kind: OrgKind;
  tier: OrgTier;
  activeSeats: number;
  seatLimit: number;
}

export interface OrgMember {
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  equipment: EquipmentId;
  joinedAt: string;
}

export interface OrgMembership {
  org: Organization;
  member: OrgMember;
}

/**
 * KeyWire authentication client for the Truck Buddy portal.
 * 
 * Integrates with the existing AgentBrowser session to handle authentication
 * and KeyWire vault operations for enterprise accounts.
 */
export function useKeywireAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [me, setMe] = useState<OrgMembership | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Get session token from localStorage (set by AgentBrowser)
        const savedToken = localStorage.getItem("keywire_token");
        if (savedToken) {
          setAccessToken(savedToken);
        }

        // Fetch current membership from the portal's org switcher API
        const membershipRes = await fetch("/api/portal/orgs", {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        });

        if (membershipRes.ok) {
          const membership = await membershipRes.json();
          setMe(membership);
        }

        setLoading(false);
      } catch (e) {
        console.error("Keywire auth init error:", e);
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }

    init();
  }, []);

  return { loading, error, accessToken, me };
}