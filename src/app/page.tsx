import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { onboardingService } from "@/modules/onboarding/onboarding.service";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/onboarding");
  }

  let onboardingCompleted = false;
  let needsAuth = false;

  try {
    const tenant = await resolveTenantContext();
    const status = await onboardingService.getOnboardingStatus(tenant.tenantId);
    onboardingCompleted = status.onboardingCompleted;
  } catch (err) {
    if (err instanceof AuthTenancyError && err.code === "UNAUTHENTICATED") {
      needsAuth = true;
    }
  }

  if (needsAuth) {
    redirect("/sign-in");
  }

  if (!onboardingCompleted) {
    redirect("/onboarding");
  }

  redirect("/chat");
}
