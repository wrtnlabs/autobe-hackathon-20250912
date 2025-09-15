import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a clinical decision support rule by ruleId from the
 * healthcare_platform_decision_support_rules table.
 *
 * This operation performs a hard delete—irreversibly removing the specified
 * clinical decision support (CDS) rule by its UUID. Only system administrators
 * can invoke this function. Deletion is auditable and generates a corresponding
 * audit log record, capturing the administrator's identity, target rule
 * details, and the operation timestamp.
 *
 * Downstream data (such as generated clinical alerts) is not affected by this
 * operation.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system administrator payload (must
 *   be a valid admin)
 * @param props.ruleId - Unique identifier of the CDS rule to be deleted (UUID)
 * @returns Void (the rule is deleted)
 * @throws {Error} If the specified ruleId does not exist in the database, an
 *   error is thrown.
 * @throws {Error} If the operation fails or the user is not authorized
 *   (enforced by decorator).
 */
export async function deletehealthcarePlatformSystemAdminDecisionSupportRulesRuleId(props: {
  systemAdmin: SystemadminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, ruleId } = props;

  // Step 1: Ensure the rule exists; throw if not found
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findFirst({
      where: { id: ruleId },
    });
  if (rule === null) {
    throw new Error("CDS rule not found");
  }

  // Step 2: Hard delete the decision support rule
  await MyGlobal.prisma.healthcare_platform_decision_support_rules.delete({
    where: { id: ruleId },
  });

  // Step 3: Write an audit log for traceability
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: rule.organization_id,
      action_type: "CDS_RULE_DELETE",
      event_context: JSON.stringify({
        rule_code: rule.rule_code,
        title: rule.title,
        trigger_event: rule.trigger_event,
        deleted_by: systemAdmin.id,
      }),
      related_entity_type: "decision_support_rule",
      related_entity_id: ruleId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
