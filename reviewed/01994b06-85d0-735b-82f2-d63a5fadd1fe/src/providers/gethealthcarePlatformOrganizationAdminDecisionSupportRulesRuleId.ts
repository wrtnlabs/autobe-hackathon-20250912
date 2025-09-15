import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch complete details for a specific CDS rule by rule ID in the platform.
 *
 * Retrieves the full metadata, logic, and configuration for a clinical decision
 * support (CDS) rule, enforcing strict organizational boundaries. Only
 * organization admins with active organization assignment can view rule
 * details, and only for rules owned by their assigned organization. Date and
 * nullable fields are handled strictly according to API contract. Throws
 * NotFound or Forbidden errors if the resource is unavailable or access is not
 * permitted.
 *
 * @param props - OrganizationAdmin: The authenticated organization admin user
 *   making the request (OrganizationadminPayload) ruleId: UUID of the CDS rule
 *   to fetch
 * @returns Complete details for the specified clinical decision support rule
 * @throws {Error} If the rule does not exist, is deleted, or is outside admin's
 *   organizational boundary
 */
export async function gethealthcarePlatformOrganizationAdminDecisionSupportRulesRuleId(props: {
  organizationAdmin: OrganizationadminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  // 1. Fetch the CDS rule by ruleId, only if not soft-deleted
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findFirst({
      where: {
        id: props.ruleId,
        deleted_at: null,
      },
    });
  if (!rule) throw new Error("Not found");

  // 2. Load the admin's organization assignment (must be active, non-deleted)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment) throw new Error("Forbidden");

  // 3. Enforce strict org boundary: admin may only see rules in their assigned org
  if (rule.organization_id !== assignment.healthcare_platform_organization_id) {
    throw new Error("Forbidden");
  }

  // 4. Return in DTO format; handle all date fields and nullables to strict API contract
  return {
    id: rule.id,
    organization_id: rule.organization_id,
    rule_code: rule.rule_code,
    title: rule.title,
    description: rule.description ?? undefined,
    trigger_event: rule.trigger_event,
    expression_json: rule.expression_json,
    is_enabled: rule.is_enabled,
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
    deleted_at: rule.deleted_at ? toISOStringSafe(rule.deleted_at) : undefined,
  };
}
