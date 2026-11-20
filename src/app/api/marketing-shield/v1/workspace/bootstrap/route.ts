/**
 * Cogent Marketing Shield - Consolidated Workspace Bootstrap Endpoint
 * Returns onboarding status, subscription summary, live search quota, active conversations,
 * products, and knowledge docs in ONE single parallelized request to eliminate client waterfalls.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { onboardingService } from "@/modules/onboarding/onboarding.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { conversationService } from "@/modules/conversations/conversation.service";
import { productService } from "@/modules/knowledge-base/product.service";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import { getRoleMetadata } from "@/modules/auth-tenancy/roles";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenantContext(req);
    const subInfo = await entitlementsService.getTenantSubscriptionInfo(tenant.tenantId);

    const [
      onboarding,
      runAuditCheck,
      searchQuota,
      conversationsResult,
      products,
      knowledgeDocs,
    ] = await Promise.all([
      onboardingService.getOnboardingStatus(tenant.tenantId).catch(() => ({
        stepCompleted: 0,
        activeScopes: [],
        hasProductTruth: false,
        onboardingCompleted: true,
        flagshipProduct: null,
      })),
      entitlementsService
        .checkTenantEntitlement(tenant.tenantId, "run_audit", subInfo)
        .catch(() => null),
      entitlementsService
        .getLiveSearchQuotaSnapshot(tenant.tenantId, subInfo)
        .catch(() => null),
      conversationService
        .listConversations(tenant.tenantId, {
          status: "ACTIVE",
          limit: 40,
          allowedCreatorIds: [tenant.userId, tenant.clerkUserId],
        })
        .catch(() => ({ conversations: [], total: 0 })),
      productService
        .listProducts(tenant.tenantId, { status: "ACTIVE" })
        .catch(() => []),
      playbookService
        .listDocuments(tenant.tenantId, { status: "ACTIVE" })
        .catch(() => []),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          authMe: {
            tenantId: tenant.tenantId,
            userId: tenant.userId,
            clerkUserId: tenant.clerkUserId,
            clerkOrgId: tenant.clerkOrgId,
            orgName: tenant.orgName,
            orgSlug: tenant.orgSlug,
            role: tenant.role,
            roleMetadata: getRoleMetadata(tenant.role),
            permissions: Array.from(tenant.permissions),
            status: tenant.status,
          },
          onboarding,
          subscription: {
            planName: subInfo.plan.name,
            planSlug: subInfo.plan.slug,
            status: subInfo.status,
            isTrial: subInfo.isTrial,
            isTrialExpired: subInfo.isTrialExpired || subInfo.status === "past_due",
            trialDaysRemaining: subInfo.trialDaysRemaining,
            trialHoursRemaining: subInfo.trialHoursRemaining,
            auditLimit: subInfo.plan.monthly_audit_limit,
            auditsUsed: runAuditCheck?.currentCount,
          },
          searchQuota,
          conversations: conversationsResult.conversations || [],
          products: Array.isArray(products) ? products : [],
          knowledgeDocs: Array.isArray(knowledgeDocs) ? knowledgeDocs : [],
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message },
        },
        { status: err.statusCode },
      );
    }
    const message = err instanceof Error ? err.message : "Failed to bootstrap workspace";
    logger.error("Workspace bootstrap failed", { error: err });
    return NextResponse.json(
      { success: false, error: { code: "BOOTSTRAP_FAILED", message } },
      { status: 500 },
    );
  }
}
