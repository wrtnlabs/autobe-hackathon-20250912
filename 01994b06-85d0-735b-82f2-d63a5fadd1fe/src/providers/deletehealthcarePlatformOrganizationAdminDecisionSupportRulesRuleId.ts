import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a clinical decision support rule by ruleId from the
 * healthcare_platform_decision_support_rules table.
 *
 * This operation removes the specified clinical decision support (CDS) rule by
 * UUID from the database. The rule is only deleted if it exists and belongs to
 * the requesting organization administrator's organization. All deletions are
 * recorded in the audit log for regulatory compliance, recording the actor,
 * time, and details of the deleted rule. Authorization is strictly enforced by
 * comparing organization context. System administrators or organization
 * administrators are the only roles allowed to perform this operation.
 *
 * @param props - The request properties
 * @param props.organizationAdmin - The authenticated organization admin payload
 * @param props.ruleId - The UUID of the CDS rule to delete
 * @returns Void
 * @throws {Error} If rule does not exist or admin lacks permission
 */
export async function deletehealthcarePlatformOrganizationAdminDecisionSupportRulesRuleId(props: {
  organizationAdmin: OrganizationadminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, ruleId } = props;

  // 1. Fetch and validate existence of rule to be deleted
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findUnique(
      {
        where: { id: ruleId },
      },
    );
  if (!rule) {
    throw new Error("Decision support rule not found");
  }

  // 2. Ensure admin belongs to the same organization as the rule
  if (rule.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Forbidden: not authorized to delete rules from another organization",
    );
  }

  // 3. Hard delete the rule (irreversible)
  await MyGlobal.prisma.healthcare_platform_decision_support_rules.delete({
    where: { id: ruleId },
  });

  // 4. Record audit log entry for traceability and compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      organization_id: rule.organization_id,
      user_id: organizationAdmin.id,
      action_type: "CDS_RULE_DELETE",
      event_context: JSON.stringify({
        ruleId: rule.id,
        rule_code: rule.rule_code,
        title: rule.title,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
