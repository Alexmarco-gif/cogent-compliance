"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import type { ConversationRecord } from "@/modules/conversations/conversation.service";
import type { SearchQuotaSnapshot } from "@/contracts/search.contracts";
import type { KnowledgeDocOption, ProductOption } from "@/components/chat/ChatComposer";
import type { AuthMeData, WorkspaceSettingsData } from "@/components/settings/types";

export interface WorkspaceSubscriptionSummary {
  planName: string;
  planSlug: string;
  status: string;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  auditLimit: number;
  auditsUsed?: number;
}

interface PersistedSnapshot {
  onboardingCompleted: boolean;
  subscription: WorkspaceSubscriptionSummary | null;
  searchQuota: SearchQuotaSnapshot | null;
  conversations: ConversationRecord[];
  products: ProductOption[];
  knowledgeDocs: KnowledgeDocOption[];
  authMe: AuthMeData | null;
  savedAt: number;
}

interface WorkspaceContextValue {
  scopeKey: string | null;
  bootstrapped: boolean;
  bootstrapping: boolean;
  /** null = unknown yet, true = completed, false = needs onboarding */
  onboardingCompleted: boolean | null;
  subscription: WorkspaceSubscriptionSummary | null;
  searchQuota: SearchQuotaSnapshot | null;
  conversations: ConversationRecord[];
  products: ProductOption[];
  knowledgeDocs: KnowledgeDocOption[];
  authMe: AuthMeData | null;
  workspaceSettings: WorkspaceSettingsData | null;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  setConversations: React.Dispatch<React.SetStateAction<ConversationRecord[]>>;
  setSearchQuota: React.Dispatch<React.SetStateAction<SearchQuotaSnapshot | null>>;
  setProducts: React.Dispatch<React.SetStateAction<ProductOption[]>>;
  setKnowledgeDocs: React.Dispatch<React.SetStateAction<KnowledgeDocOption[]>>;
  setWorkspaceSettings: React.Dispatch<React.SetStateAction<WorkspaceSettingsData | null>>;
  markOnboardingCompleted: () => void;
  ensureBootstrapped: (opts?: { force?: boolean }) => Promise<void>;
  refreshSearchQuota: () => Promise<SearchQuotaSnapshot | null>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BOOTSTRAP_FRESH_MS = 45_000;
const SESSION_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

function readSessionSnapshot(scopeKey: string): PersistedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`cogent:ws:${scopeKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > SESSION_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionSnapshot(scopeKey: string, snapshot: PersistedSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`cogent:ws:${scopeKey}`, JSON.stringify(snapshot));
  } catch {
    // Ignore quota or storage restrictions
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, orgId, userId } = useAuth();
  const scopeKey = isLoaded && isSignedIn && userId && orgId ? `${userId}::${orgId}` : null;

  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<WorkspaceSubscriptionSummary | null>(null);
  const [searchQuota, setSearchQuota] = useState<SearchQuotaSnapshot | null>(null);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocOption[]>([]);
  const [authMe, setAuthMe] = useState<AuthMeData | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const lastFetchedAtRef = useRef<number>(0);
  const lastScopeRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);

  // Hydrate sidebar collapse preference once
  useEffect(() => {
    try {
      if (window.localStorage.getItem("cogent:sidebar-collapsed") === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage failures
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cogent:sidebar-collapsed", String(next));
      } catch {
        // Ignore storage failures
      }
      return next;
    });
  }, []);

  // Reset or hydrate from sessionStorage synchronously when auth scope changes
  useEffect(() => {
    if (lastScopeRef.current === scopeKey) return;
    lastScopeRef.current = scopeKey;
    lastFetchedAtRef.current = 0;
    inflightRef.current = null;
    setWorkspaceSettings(null);

    if (!scopeKey) {
      setBootstrapped(false);
      setBootstrapping(false);
      setOnboardingCompleted(null);
      setSubscription(null);
      setSearchQuota(null);
      setConversations([]);
      setProducts([]);
      setKnowledgeDocs([]);
      setAuthMe(null);
      return;
    }

    const cached = readSessionSnapshot(scopeKey);
    if (cached) {
      setOnboardingCompleted(cached.onboardingCompleted);
      setSubscription(cached.subscription);
      setSearchQuota(cached.searchQuota);
      setConversations(cached.conversations || []);
      setProducts(cached.products || []);
      setKnowledgeDocs(cached.knowledgeDocs || []);
      setAuthMe(cached.authMe || null);
      setBootstrapped(true);
    } else {
      setBootstrapped(false);
      setOnboardingCompleted(null);
      setSubscription(null);
      setSearchQuota(null);
      setConversations([]);
      setProducts([]);
      setKnowledgeDocs([]);
      setAuthMe(null);
    }
  }, [scopeKey]);

  const ensureBootstrapped = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!scopeKey) return;
      const force = Boolean(opts?.force);
      if (!force && lastFetchedAtRef.current > 0 && Date.now() - lastFetchedAtRef.current < BOOTSTRAP_FRESH_MS) {
        return;
      }
      if (inflightRef.current) {
        return inflightRef.current;
      }

      const activeScope = scopeKey;
      const run = (async () => {
        setBootstrapping(true);
        try {
          const res = await fetch("/api/marketing-shield/v1/workspace/bootstrap", {
            cache: "no-store",
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              return;
            }
            return;
          }
          const json = await res.json().catch(() => null);
          if (!json?.success || !json.data) return;
          if (lastScopeRef.current !== activeScope) return;

          const data = json.data;
          const nextOnboarding = Boolean(data.onboarding?.onboardingCompleted);
          const nextSub = (data.subscription || null) as WorkspaceSubscriptionSummary | null;
          const nextQuota = (data.searchQuota || null) as SearchQuotaSnapshot | null;
          const nextConvs = Array.isArray(data.conversations) ? data.conversations : [];
          const nextProducts = Array.isArray(data.products) ? data.products : [];
          const nextDocs = Array.isArray(data.knowledgeDocs) ? data.knowledgeDocs : [];
          const nextAuthMe = (data.authMe || null) as AuthMeData | null;

          setOnboardingCompleted(nextOnboarding);
          setSubscription(nextSub);
          setSearchQuota(nextQuota);
          setConversations(nextConvs);
          setProducts(nextProducts);
          setKnowledgeDocs(nextDocs);
          setAuthMe(nextAuthMe);
          setBootstrapped(true);
          lastFetchedAtRef.current = Date.now();

          writeSessionSnapshot(activeScope, {
            onboardingCompleted: nextOnboarding,
            subscription: nextSub,
            searchQuota: nextQuota,
            conversations: nextConvs,
            products: nextProducts,
            knowledgeDocs: nextDocs,
            authMe: nextAuthMe,
            savedAt: Date.now(),
          });
        } catch {
          // Non-fatal: individual pages retain fallback error handling
        } finally {
          setBootstrapping(false);
          inflightRef.current = null;
        }
      })();

      inflightRef.current = run;
      return run;
    },
    [scopeKey],
  );

  const refreshSearchQuota = useCallback(async (): Promise<SearchQuotaSnapshot | null> => {
    if (!scopeKey) return null;
    try {
      const res = await fetch("/api/marketing-shield/v1/search/quota", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const snap = (json?.data?.quota || json?.data) as SearchQuotaSnapshot | undefined;
      if (res.ok && json?.success && snap && typeof snap.live_web_allowed === "boolean") {
        setSearchQuota(snap);
        return snap;
      }
    } catch {
      // Non-blocking
    }
    return null;
  }, [scopeKey]);

  const markOnboardingCompleted = useCallback(() => {
    setOnboardingCompleted(true);
    if (scopeKey) {
      const prev = readSessionSnapshot(scopeKey);
      writeSessionSnapshot(scopeKey, {
        onboardingCompleted: true,
        subscription: prev?.subscription ?? subscription,
        searchQuota: prev?.searchQuota ?? searchQuota,
        conversations: prev?.conversations ?? conversations,
        products: prev?.products ?? products,
        knowledgeDocs: prev?.knowledgeDocs ?? knowledgeDocs,
        authMe: prev?.authMe ?? authMe,
        savedAt: Date.now(),
      });
    }
  }, [scopeKey, subscription, searchQuota, conversations, products, knowledgeDocs, authMe]);

  // Listen to global billing & search quota mutation events once at the root
  useEffect(() => {
    if (!scopeKey) return;
    const onBillingUpdated = () => {
      void ensureBootstrapped({ force: true });
    };
    const onQuotaUpdated = () => {
      void refreshSearchQuota();
    };
    window.addEventListener("cogent:billing-updated", onBillingUpdated);
    window.addEventListener("cogent:search-quota-updated", onQuotaUpdated);
    return () => {
      window.removeEventListener("cogent:billing-updated", onBillingUpdated);
      window.removeEventListener("cogent:search-quota-updated", onQuotaUpdated);
    };
  }, [scopeKey, ensureBootstrapped, refreshSearchQuota]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      scopeKey,
      bootstrapped,
      bootstrapping,
      onboardingCompleted,
      subscription,
      searchQuota,
      conversations,
      products,
      knowledgeDocs,
      authMe,
      workspaceSettings,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      setConversations,
      setSearchQuota,
      setProducts,
      setKnowledgeDocs,
      setWorkspaceSettings,
      markOnboardingCompleted,
      ensureBootstrapped,
      refreshSearchQuota,
    }),
    [
      scopeKey,
      bootstrapped,
      bootstrapping,
      onboardingCompleted,
      subscription,
      searchQuota,
      conversations,
      products,
      knowledgeDocs,
      authMe,
      workspaceSettings,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      markOnboardingCompleted,
      ensureBootstrapped,
      refreshSearchQuota,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
