/**
 * Cogent Marketing Shield - Internal Enterprise Diagnostic & Provisioning CLI
 *
 * Inspects why a workspace/user is still on the Evaluation Trial and can
 * immediately activate the Enterprise plan (no Paystack charge) for internal
 * marketing, demo, and walkthrough teams.
 *
 * Usage:
 *   npx tsx scripts/grant-enterprise.ts --list
 *   npx tsx scripts/grant-enterprise.ts --email user@company.com
 *   npx tsx scripts/grant-enterprise.ts --org org_2abc123 --apply
 *   npx tsx scripts/grant-enterprise.ts --email user@company.com --org org_2abc123 --apply
 */

import fs from "fs";
import path from "path";

function loadLocalEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

interface ParsedArgs {
  list: boolean;
  apply: boolean;
  email?: string;
  org?: string;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { list: false, apply: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") result.list = true;
    else if (arg === "--apply") result.apply = true;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--email" && argv[i + 1]) {
      result.email = argv[i + 1]?.trim().toLowerCase();
      i += 1;
    } else if (arg === "--org" && argv[i + 1]) {
      result.org = argv[i + 1]?.trim();
      i += 1;
    }
  }
  return result;
}

function printUsage() {
  console.log(`
Cogent Enterprise Diagnostic & Provisioning CLI

Options:
  --list               List tenants and their current subscription status
  --email <email>      Inspect a Clerk user by email and check allowlist eligibility
  --org <id_or_slug>   Target a specific Clerk org ID (org_...), tenant UUID, or slug
  --apply              Apply the Enterprise upgrade (default is dry-run diagnostic)
  --help               Show this help message
`);
}

async function main() {
  loadLocalEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.list && !args.email && !args.org)) {
    printUsage();
    process.exit(0);
  }

  const [{ clerkClient }, { createAdminSupabaseClient }, allowlistMod, { entitlementsService }] =
    await Promise.all([
      import("@clerk/nextjs/server"),
      import("../src/lib/supabase"),
      import("../src/modules/billing/enterprise-allowlist.service"),
      import("../src/modules/billing/entitlements.service"),
    ]);

  const supabase = createAdminSupabaseClient();
  const emailAllowlist = allowlistMod.parseInternalEnterpriseEmails();
  const orgAllowlist = allowlistMod.parseInternalEnterpriseOrgIds();

  console.log("Environment Allowlist Config:");
  console.log(
    `  INTERNAL_ENTERPRISE_EMAILS: ${emailAllowlist.size > 0 ? Array.from(emailAllowlist).join(", ") : "(not set)"}`,
  );
  console.log(
    `  INTERNAL_ENTERPRISE_ORG_IDS: ${orgAllowlist.size > 0 ? Array.from(orgAllowlist).join(", ") : "(not set)"}\n`,
  );

  let clerkUserId: string | undefined;
  let clerkEmailVerified: boolean | undefined;

  if (args.email) {
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [args.email], limit: 5 });
    const matchedUser = users.data[0];
    if (!matchedUser) {
      console.error(`No Clerk user found for email: ${args.email}`);
      process.exit(1);
    }
    clerkUserId = matchedUser.id;
    const emailRecord = matchedUser.emailAddresses.find(
      (e) => e.emailAddress.toLowerCase().trim() === args.email,
    );
    clerkEmailVerified = emailRecord?.verification?.status === "verified";

    console.log("Clerk User:");
    console.log(`  userId: ${matchedUser.id}`);
    console.log(`  email: ${args.email} (verified=${clerkEmailVerified})`);
    console.log(`  in INTERNAL_ENTERPRISE_EMAILS: ${emailAllowlist.has(args.email)}`);

    const memberships = await client.users.getOrganizationMembershipList({
      userId: matchedUser.id,
      limit: 20,
    });
    console.log(`  Clerk Org Memberships (${memberships.data.length}):`);
    for (const mem of memberships.data) {
      console.log(
        `    - ${mem.organization.id} | ${mem.organization.name} (slug=${mem.organization.slug}) | role=${mem.role}`,
      );
    }
    console.log("");
  }

  if (args.list) {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, slug, clerk_org_id, status, settings, created_at")
      .neq("id", "11111111-1111-1111-1111-111111111111")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to list tenants:", error.message);
      process.exit(1);
    }

    console.log(`Found ${tenants?.length || 0} tenant(s):`);
    for (const t of tenants || []) {
      const subInfo = await entitlementsService.getTenantSubscriptionInfo(t.id);
      const settings = (t.settings || {}) as Record<string, unknown>;
      console.log(
        `  - ${t.name} | tenantId=${t.id} | clerkOrgId=${t.clerk_org_id || "none"} | status=${t.status} | plan=${subInfo.plan.slug} (${subInfo.status}, isTrial=${subInfo.isTrial}) | skipReason=${String(settings.enterprise_comp_skip_reason || "none")}`,
      );
    }
    if (!args.org && !args.email) {
      process.exit(0);
    }
  }

  // Locate target tenant(s)
  let targetTenants: Array<{
    id: string;
    name: string;
    slug: string;
    clerk_org_id: string | null;
    status: string;
    settings: Record<string, unknown> | null;
  }> = [];

  if (args.org) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.org);
    const query = supabase
      .from("tenants")
      .select("id, name, slug, clerk_org_id, status, settings");

    const { data, error } = isUuid
      ? await query.eq("id", args.org)
      : await query.or(`clerk_org_id.eq."${args.org}",slug.eq."${args.org}"`);

    if (error || !data || data.length === 0) {
      console.error(`No Supabase tenant found matching --org ${args.org}`);
      process.exit(1);
    }
    targetTenants = data;
  } else if (clerkUserId) {
    const { data: mems } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", clerkUserId);
    const tenantIds = Array.from(new Set((mems || []).map((m) => m.tenant_id)));
    if (tenantIds.length > 0) {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, slug, clerk_org_id, status, settings")
        .in("id", tenantIds);
      targetTenants = data || [];
    }
  }

  if (targetTenants.length === 0) {
    console.log("No matching Supabase tenant rows found for that user/org yet.");
    process.exit(0);
  }

  for (const t of targetTenants) {
    const subInfo = await entitlementsService.getTenantSubscriptionInfo(t.id);
    const settings = (t.settings || {}) as Record<string, unknown>;
    console.log(`Tenant Diagnostic: ${t.name}`);
    console.log(`  tenantId: ${t.id}`);
    console.log(`  clerkOrgId: ${t.clerk_org_id || "(none)"}`);
    console.log(`  tenantStatus: ${t.status}`);
    console.log(
      `  resolvedPlan: ${subInfo.plan.slug} (${subInfo.plan.name}) | status=${subInfo.status} | isTrial=${subInfo.isTrial}`,
    );
    console.log(
      `  compOwnerUserId: ${String(settings.enterprise_comp_owner_user_id || "(unset)")}`,
    );
    console.log(`  compCheckedAt: ${String(settings.enterprise_comp_checked_at || "(unset)")}`);
    console.log(`  compSkipReason: ${String(settings.enterprise_comp_skip_reason || "(none)")}`);

    if (!args.apply) {
      console.log("  [DRY-RUN] Re-run with --apply (and --org if multiple) to grant Enterprise.\n");
    }
  }

  if (!args.apply) {
    process.exit(0);
  }

  if (targetTenants.length > 1 && !args.org) {
    console.error(
      "Multiple tenants found for this user. Pass --org <clerk_org_id_or_slug> to specify which organization to upgrade.",
    );
    process.exit(1);
  }

  const target = targetTenants[0];
  if (!target) {
    process.exit(1);
  }

  const res = await allowlistMod.activateEnterprisePlanForTenant({
    tenantId: target.id,
    existingSettings: (target.settings || {}) as Record<string, unknown>,
    clerkUserId,
    clerkOrgId: target.clerk_org_id,
    matchedEmail: args.email,
    source: "ADMIN_CLI",
    promoteWorkspaceAdminToCco: Boolean(clerkUserId),
  });

  if (!res.granted) {
    console.error("Failed to activate Enterprise plan:", res);
    process.exit(1);
  }

  const verifiedSub = await entitlementsService.getTenantSubscriptionInfo(target.id);
  console.log(
    `✅ Enterprise activated for "${target.name}" (${target.clerk_org_id || target.id}). Resolved plan: ${verifiedSub.plan.name} (${verifiedSub.status}, isTrial=${verifiedSub.isTrial}).`,
  );
}

main().catch((err) => {
  console.error("Error running grant-enterprise:", err);
  process.exit(1);
});
