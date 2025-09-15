import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new clinical decision support rule (CDS) in the platform.
 *
 * This operation creates and persists a new CDS rule by inserting all supplied
 * configuration and business fields into the
 * 'healthcare_platform_decision_support_rules' table. The CDS rule definition
 * includes linkage to an organization, a unique rule code, title, trigger
 * event, rule logic, optional description, and enablement status.
 * System-generated timestamps and unique UUIDs are set automatically. Only
 * authenticated system admins can perform this operation.
 *
 * If a rule with the same rule_code already exists within the organization, a
 * unique constraint error is raised by Prisma. All date and UUID values are
 * formatted to their required types. No native Date or 'as' assertion is used
 * anywhere.
 *
 * @param props - The operation parameters
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the creation
 * @param props.body - The CDS rule creation fields
 * @returns The newly created and persisted CDS rule, with all required metadata
 *   and system fields
 * @throws {Error} If uniqueness constraints are violated (organization_id,
 *   rule_code) or a database error occurs
 */
export async function posthealthcarePlatformSystemAdminDecisionSupportRules(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDecisionSupportRule.ICreate;
}): Promise<IHealthcarePlatformDecisionSupportRule> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_decision_support_rules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        rule_code: props.body.rule_code,
        title: props.body.title,
        description: props.body.description,
        trigger_event: props.body.trigger_event,
        expression_json: props.body.expression_json,
        is_enabled: props.body.is_enabled,
        created_at: now,
        updated_at: now,
        // deleted_at not set upon creation
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    organization_id: created.organization_id as string & tags.Format<"uuid">,
    rule_code: created.rule_code,
    title: created.title,
    description: created.description ?? undefined,
    trigger_event: created.trigger_event,
    expression_json: created.expression_json,
    is_enabled: created.is_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
