/**
 * Cogent Marketing Shield - Internal Workspace CLI (owner emergency lever)
 *
 * Flags or unflags a tenant as an owner-only "Internal Workspace" (unlimited
 * Enterprise, never billed) by writing the dedicated `tenants.billing_override`
 * column. Requires SUPABASE service-role credentials of the target environment.
 *
 * Usage:
 *   npx tsx scripts/grant-enterprise.ts --list
 *   npx tsx scripts/grant-enterprise.ts --email owner@company.com
 *   npx tsx scripts/grant-enterprise.ts --org org_2abc123            (dry run)
 *   npx tsx scripts/grant-enterprise.ts --org org_2abc123 --apply    (enable)
 *   npx tsx scripts/grant-enterprise.ts --org org_2abc123 --disable  (disable)
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
  disable: boolean;
  email?: string;
  org?: string;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { list: false, apply: false, disable: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") result.list = true;
    else if (arg === "--apply") result.apply = true;
    else if (arg === "--disable") result.disable = true;
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
Cogent Internal Workspace CLI

Options:
  --list               List tenants with their resolved plan and Internal flag
  --email <email>      Show the Clerk user and their organization memberships
  --org <id_or_slug>   Target a Clerk org ID (org_...), tenant UUID, or slug
  --apply              Mark the target as an Internal Workspace (unlimited Enterprise)
  --disable            Remove the Internal Workspace flag from the target
  --help               Show this help message
`);
}

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  clerk_org_id: string | null;
  status: string;
  billing_override?: string | null;
};

async function main() {
  loadLocalEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.list && !args.email && !args.org)) {
    printUsage();
    process.exit(0);
  }

  const [{ clerkClient }, { createAdminSupabaseClient }, internalMod, { entitlementsService }] =
    await Promise.all([
      import("@clerk/nextjs/server"),
      import("../src/lib/supabase"),
      import("../src/modules/billing/internal-workspace.service"),
      import("../src/modules/billing/entitlements.service"),
    ]);

  const supabase = createAdminSupabaseClient();

  if (args.email) {
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [args.email], limit: 5 });
    const matchedUser = users.data[0];
    if (!matchedUser) {
      console.error(`No Clerk user found for email: ${args.email}`);
      process.exit(1);
    }
    const emailRecord = matchedUser.emailAddresses.find(
      (e) => e.emailAddress.toLowerCase().trim() === args.email,
    );
    console.log("Clerk User:");
    console.log(`  userId: ${matchedUser.id}`);
    console.log(`  email: ${args.email} (verified=${emailRecord?.verification?.status === "verified"})`);
    const memberships = await client.users.getOrganizationMembershipList({
      userId: matchedUser.id,
      limit: 50,
    });
    console.log(`  Clerk Org Memberships (${memberships.data.length}):`);
    for (const mem of memberships.data) {
      console.log(
        `    - ${mem.organization.id} | ${mem.organization.name} (slug=${mem.organization.slug}) | role=${mem.role} | createdBy=${mem.organization.createdBy || "?"}`,
      );
    }
    console.log("");
  }

  if (args.list) {
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("*")
      .neq("id", "11111111-1111-1111-1111-111111111111")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to list tenants:", error.message);
      process.exit(1);
    }

    console.log(`Found ${tenants?.length || 0} tenant(s):`);
    for (const t of (tenants || []) as TenantRow[]) {
      const subInfo = await entitlementsService.getTenantSubscriptionInfo(t.id);
      console.log(
        `  - ${t.name} | tenantId=${t.id} | clerkOrgId=${t.clerk_org_id || "none"} | status=${t.status} | internal=${internalMod.isInternalOverride(t.billing_override)} | plan=${subInfo.plan.slug} (${subInfo.status}, isTrial=${subInfo.isTrial})`,
      );
    }
  }

  if (!args.org) {
    process.exit(0);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.org);
  const query = supabase.from("tenants").select("*");
  const { data, error } = isUuid
    ? await query.eq("id", args.org)
    : await query.or(`clerk_org_id.eq."${args.org}",slug.eq."${args.org}"`);

  if (error || !data || data.length === 0) {
    console.error(`No Supabase tenant found matching --org ${args.org}`);
    process.exit(1);
  }
  if (data.length > 1) {
    console.error(`--org ${args.org} matched ${data.length} tenants; pass the tenant UUID instead.`);
    process.exit(1);
  }

  const target = data[0] as TenantRow;
  console.log(`Target: ${target.name} | tenantId=${target.id} | clerkOrgId=${target.clerk_org_id || "none"}`);
  console.log(`  currently internal: ${internalMod.isInternalOverride(target.billing_override)}`);

  if (!args.apply && !args.disable) {
    console.log("  [DRY-RUN] Re-run with --apply to enable or --disable to remove.");
    process.exit(0);
  }

  const res = await internalMod.setInternalWorkspace({
    tenantId: target.id,
    enabled: args.apply && !args.disable,
    actorId: "admin_cli",
    source: "ADMIN_CLI",
  });

  if (!res.ok) {
    console.error("Failed to update Internal Workspace flag:", res.error);
    process.exit(1);
  }

  const verifiedSub = await entitlementsService.getTenantSubscriptionInfo(target.id);
  console.log(
    `✅ "${target.name}" internal=${res.isInternal}. Resolved plan: ${verifiedSub.plan.name} (${verifiedSub.status}, isTrial=${verifiedSub.isTrial}).`,
  );
}

main().catch((err) => {
  console.error("Error running grant-enterprise:", err);
  process.exit(1);
});
