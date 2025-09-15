import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new clinical decision support rule (CDS) in the platform.
 *
 * This operation creates a new CDS rule row in the
 * 'healthcare_platform_decision_support_rules' table, storing all required
 * configuration and business data coupled to the authenticated admin's
 * organization. Only privileged organizationAdmin users may perform this
 * operation, and scope is strictly enforced—created CDS rules must match the
 * admin's own organization. Uniqueness of rule_code within the organization is
 * enforced for compliance and business logic integrity. All timestamps and
 * identifiers are handled safely with branded types.
 *
 * @param props - Properties for the request, including organizationAdmin
 *   authentication payload and CDS rule creation body.
 * @param props.organizationAdmin - Authenticated organizationAdmin
 * @param props.body - IHealthcarePlatformDecisionSupportRule.ICreate, providing
 *   configuration, logic, and metadata for the new rule.
 * @returns The created CDS rule as an IHealthcarePlatformDecisionSupportRule,
 *   with system-assigned ID and generated timestamps.
 * @throws {Error} If the rule_code already exists for the organization or if
 *   organization scope is violated.
 */
export async function posthealthcarePlatformOrganizationAdminDecisionSupportRules(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDecisionSupportRule.ICreate;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  const { organizationAdmin, body } = props;

  // Enforce organization scope: organizationAdmin only allowed to create rules for their own org
  if (body.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Forbidden: You are only allowed to create rules for your own organization.",
    );
  }

  // Uniqueness enforcement: rule_code must be unique within organization
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findFirst({
      where: {
        organization_id: body.organization_id,
        rule_code: body.rule_code,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "A clinical decision support rule with this rule_code already exists for this organization.",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: body.organization_id,
        rule_code: body.rule_code,
        title: body.title,
        description: body.description ?? undefined,
        trigger_event: body.trigger_event,
        expression_json: body.expression_json,
        is_enabled: body.is_enabled,
        created_at: now,
        updated_at: now,
        // deleted_at left undefined/null (active)
      },
    });
  return {
    id: created.id,
    organization_id: created.organization_id,
    rule_code: created.rule_code,
    title: created.title,
    description: created.description ?? undefined,
    trigger_event: created.trigger_event,
    expression_json: created.expression_json,
    is_enabled: created.is_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
