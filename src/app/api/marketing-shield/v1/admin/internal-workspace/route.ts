/**
 * Owner-only Internal Workspace control.
 *
 * GET    -> { isInternal } for the active workspace (owner only)
 * POST   -> { enabled: boolean } to flag/unflag the active workspace (owner only)
 *
 * Non-owners always receive 404 so the endpoint's existence is not disclosed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import {
  isDemoTenant,
  isInternalWorkspace,
  isPlatformOwner,
  setInternalWorkspace,
} from "@/modules/billing/internal-workspace.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const ToggleSchema = z.object({ enabled: z.boolean() });

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenantContext(req);
    if (!(await isPlatformOwner(tenant.clerkUserId))) return NOT_FOUND();

    return NextResponse.json(
      {
        isOwner: true,
        isInternal: await isInternalWorkspace(tenant.tenantId),
        isDemoTenant: isDemoTenant(tenant.tenantId, tenant.clerkOrgId),
        orgName: tenant.orgName,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (err: unknown) {
    if (err instanceof AuthTenancyError) return NOT_FOUND();
    logger.error("Internal workspace status lookup failed", { error: err });
    return NOT_FOUND();
  }
}

export async function POST(req: NextRequest) {
  let tenant;
  try {
    tenant = await resolveTenantContext(req);
  } catch {
    return NOT_FOUND();
  }

  if (!(await isPlatformOwner(tenant.clerkUserId))) return NOT_FOUND();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const parsed = ToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body must be { enabled: boolean }" }, { status: 400 });
  }

  if (isDemoTenant(tenant.tenantId, tenant.clerkOrgId)) {
    return NextResponse.json(
      { error: "The shared demo tenant cannot be an Internal Workspace." },
      { status: 400 },
    );
  }

  const result = await setInternalWorkspace({
    tenantId: tenant.tenantId,
    enabled: parsed.data.enabled,
    actorId: tenant.clerkUserId,
    source: "OWNER_SETTINGS_TOGGLE",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Update failed" }, { status: 500 });
  }

  return NextResponse.json(
    { isOwner: true, isInternal: result.isInternal },
    { status: 200, headers: NO_STORE },
  );
}
