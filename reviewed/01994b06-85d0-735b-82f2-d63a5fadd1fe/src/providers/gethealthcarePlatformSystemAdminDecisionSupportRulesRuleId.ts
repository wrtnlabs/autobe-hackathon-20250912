import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch complete details for a specific CDS rule by rule ID in the platform.
 *
 * Retrieves all details for a specific clinical decision support rule from
 * 'healthcare_platform_decision_support_rules' by rule ID. This endpoint is
 * essential for administrative, analytics, or compliance roles to view rule
 * metadata, logic (expression_json), trigger event, lifecycle metadata, enabled
 * status, and audit history.
 *
 * Authorization checks ensure that only users with appropriate administrative
 * or analytic privileges and proper organization/department scoping can access
 * this rule detail. The rule ID must be a valid UUID; errors are returned for
 * invalid IDs or lack of permissions.
 *
 * Expected behaviors include full rule details in a compliance-ready structure,
 * error and not-found handling, and compatibility with audit and workflow
 * configuration tools. This is used in conjunction with the rule search/list
 * endpoint to permit full lifecycle management of CDS rule entities in the
 * production system.
 *
 * @param props - Properties required to fetch the CDS rule detail
 * @param props.systemAdmin - The authenticated Systemadmin user payload
 * @param props.ruleId - Unique identifier (UUID) of the CDS rule to fetch
 * @returns Complete CDS rule details matching the specified UUID, including
 *   configuration and status
 * @throws {Error} If the rule is not found or the user is not authorized
 */
export async function gethealthcarePlatformSystemAdminDecisionSupportRulesRuleId(props: {
  systemAdmin: SystemadminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  const { ruleId } = props;
  const rule =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.findUniqueOrThrow(
      {
        where: { id: ruleId },
        select: {
          id: true,
          organization_id: true,
          rule_code: true,
          title: true,
          description: true,
          trigger_event: true,
          expression_json: true,
          is_enabled: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: rule.id,
    organization_id: rule.organization_id,
    rule_code: rule.rule_code,
    title: rule.title,
    description: rule.description === null ? undefined : rule.description,
    trigger_event: rule.trigger_event,
    expression_json: rule.expression_json,
    is_enabled: rule.is_enabled,
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
    deleted_at:
      rule.deleted_at === null ? undefined : toISOStringSafe(rule.deleted_at),
  };
}
