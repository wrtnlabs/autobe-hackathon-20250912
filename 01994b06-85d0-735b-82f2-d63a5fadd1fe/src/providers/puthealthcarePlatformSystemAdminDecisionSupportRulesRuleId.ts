import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing clinical decision support rule (CDS) by rule ID.
 *
 * This operation updates the healthcare_platform_decision_support_rules entry
 * with the given ruleId, allowing modification of any subset of: title,
 * description, trigger_event, expression_json, and is_enabled fields. Only
 * system admins may update. Immutable fields (id, organization_id, rule_code,
 * created_at, deleted_at) are never changed. Updates the updated_at field to
 * the current time for every modification. Returns the complete and
 * fully-updated rule.
 *
 * @param props - The request properties
 * @param props.systemAdmin - The authenticated SystemadminPayload for
 *   authorization (must be a real system admin)
 * @param props.ruleId - UUID of the decision support rule to update
 * @param props.body - Partial update object for modifiable rule attributes
 * @returns The fully updated IHealthcarePlatformDecisionSupportRule object
 * @throws Error if rule not found or update fails
 */
export async function puthealthcarePlatformSystemAdminDecisionSupportRulesRuleId(props: {
  systemAdmin: SystemadminPayload;
  ruleId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDecisionSupportRule.IUpdate;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  const { ruleId, body } = props;
  // Fetch the existing rule
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findUnique(
      {
        where: { id: ruleId },
      },
    );
  if (!rule) throw new Error("Decision support rule not found");

  // Prepare updated fields (partial)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.trigger_event !== undefined && {
      trigger_event: body.trigger_event,
    }),
    ...(body.expression_json !== undefined && {
      expression_json: body.expression_json,
    }),
    ...(body.is_enabled !== undefined && { is_enabled: body.is_enabled }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.update({
      where: { id: ruleId },
      data: updateData,
    });

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
