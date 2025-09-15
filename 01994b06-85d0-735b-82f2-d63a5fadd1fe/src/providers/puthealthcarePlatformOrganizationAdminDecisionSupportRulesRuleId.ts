import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing clinical decision support rule (CDS) by rule ID.
 *
 * This operation updates an existing CDS rule in the platform, identified by
 * its unique rule ID, allowing modification of metadata, rule logic, trigger
 * events, activation status, and description. Only organization admins can
 * execute this operation, and strict organization ownership is enforced. The
 * response returns the updated rule with all metadata for compliance and audit
 * traceability.
 *
 * @param props - Arguments for the update operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the update (OrganizationadminPayload)
 * @param props.ruleId - The unique CDS rule ID (UUID) to update
 * @param props.body - The object with the new/changed attributes for the rule
 *   (any subset of allowed fields)
 * @returns The fully updated CDS rule, including metadata and system fields
 * @throws {Error} If the rule does not exist or does not belong to the admin's
 *   organization
 */
export async function puthealthcarePlatformOrganizationAdminDecisionSupportRulesRuleId(props: {
  organizationAdmin: OrganizationadminPayload;
  ruleId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDecisionSupportRule.IUpdate;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  const { organizationAdmin, ruleId, body } = props;

  // 1. Fetch the rule by ID and ensure it exists & is active (not soft-deleted)
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findFirst({
      where: {
        id: ruleId,
        deleted_at: null,
      },
    });
  if (!rule) {
    throw new Error("Decision support rule not found");
  }

  // 2. Enforce strict org ownership check
  if (rule.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Forbidden: You do not have permission to update this decision support rule",
    );
  }

  // 3. Prepare updated_at timestamp (must conform to string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // 4. Perform update (partial, only allowed fields, skip undefined)
  const updated =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.update({
      where: { id: ruleId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.trigger_event !== undefined && {
          trigger_event: body.trigger_event,
        }),
        ...(body.expression_json !== undefined && {
          expression_json: body.expression_json,
        }),
        ...(body.is_enabled !== undefined && { is_enabled: body.is_enabled }),
        updated_at: now,
      },
    });

  // 5. Return result, converting all Date fields with toISOStringSafe
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    rule_code: updated.rule_code,
    title: updated.title,
    description: updated.description ?? undefined,
    trigger_event: updated.trigger_event,
    expression_json: updated.expression_json,
    is_enabled: updated.is_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
