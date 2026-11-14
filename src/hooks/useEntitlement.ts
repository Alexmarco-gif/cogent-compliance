"use client";

import { useEffect, useState, useCallback } from "react";
import { FeatureGateType, EntitlementCheckResult } from "@/contracts/billing.contracts";

export interface UseEntitlementReturn {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  isLoading: boolean;
  error?: string;
  refetch: () => Promise<void>;
}

const CACHE_TTL_MS = 60 * 1000;
const entitlementCache = new Map<FeatureGateType, { data: EntitlementCheckResult; timestamp: number }>();

export function useEntitlement(feature: FeatureGateType): UseEntitlementReturn {
  const [allowed, setAllowed] = useState<boolean>(true);
  const [reason, setReason] = useState<string | undefined>();
  const [currentCount, setCurrentCount] = useState<number | undefined>();
  const [limit, setLimit] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  const fetchEntitlement = useCallback(
    async (force = false) => {
      const cached = entitlementCache.get(feature);
      if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setAllowed(cached.data.allowed);
        setReason(cached.data.reason);
        setCurrentCount(cached.data.currentCount);
        setLimit(cached.data.limit);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const res = await fetch(`/api/marketing-shield/v1/billing/entitlements?feature=${feature}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch entitlement (${res.status})`);
        }
        const data: EntitlementCheckResult = await res.json();
        entitlementCache.set(feature, { data, timestamp: Date.now() });

        setAllowed(data.allowed);
        setReason(data.reason);
        setCurrentCount(data.currentCount);
        setLimit(data.limit);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Entitlement check failed";
        setError(msg);
        // Default to permissive or prior state to avoid crashing UI
      } finally {
        setIsLoading(false);
      }
    },
    [feature],
  );

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  return {
    allowed,
    reason,
    currentCount,
    limit,
    isLoading,
    error,
    refetch: () => fetchEntitlement(true),
  };
}
