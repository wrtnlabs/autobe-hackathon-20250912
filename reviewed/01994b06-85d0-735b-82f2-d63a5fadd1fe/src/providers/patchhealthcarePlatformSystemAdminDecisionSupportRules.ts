import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { IPageIHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDecisionSupportRule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filterable list of clinical decision support
 * (CDS) rules in the healthcare platform.
 *
 * This endpoint allows system administrators and privileged
 * analytics/compliance users to search, filter, and sort CDS rules defined in
 * the platform for any organization. Supports multi-field searching, ordering,
 * and auditing use cases for regulatory and clinical best-practice management.
 *
 * Security: Requires systemAdmin (SystemadminPayload) authentication. Only
 * available to users with full administrative privileges.
 *
 * @param props - Operation props including:
 *
 *   - SystemAdmin: SystemadminPayload (authenticated system admin payload)
 *   - Body: IHealthcarePlatformDecisionSupportRule.IRequest (filter, sort, paging)
 *
 * @returns Paginated, filterable CDS rule list with results and metadata.
 * @throws Error if database operation fails or unexpected error occurs.
 */
export async function patchhealthcarePlatformSystemAdminDecisionSupportRules(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDecisionSupportRule.IRequest;
}): Promise<IPageIHealthcarePlatformDecisionSupportRule> {
  const { body } = props;
  // Pagination defaults
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  // Remove branding for Prisma calculations
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  // Sanitize sort (allow listed fields, fallback to created_at desc)
  let sortField = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, dir] = body.sort.trim().split(/\s+/);
    if (["created_at", "rule_code", "title"].includes(field)) {
      sortField = field;
      if (dir === "asc" || dir === "desc") sortOrder = dir;
    }
  }
  // Build Prisma where filters for supported fields (department_id not present in schema)
  const where = {
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.rule_code != null && { rule_code: { contains: body.rule_code } }),
    ...(body.title != null && { title: { contains: body.title } }),
    ...(body.trigger_event != null && { trigger_event: body.trigger_event }),
    ...(body.is_enabled !== undefined &&
      body.is_enabled !== null && { is_enabled: body.is_enabled }),
    ...(body.created_at_from != null &&
      body.created_at_to != null && {
        created_at: {
          gte: body.created_at_from,
          lte: body.created_at_to,
        },
      }),
    ...(body.created_at_from != null &&
      body.created_at_to == null && {
        created_at: { gte: body.created_at_from },
      }),
    ...(body.created_at_to != null &&
      body.created_at_from == null && {
        created_at: { lte: body.created_at_to },
      }),
    deleted_at: null,
  };
  // Concurrent queries for performance
  const [results, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_decision_support_rules.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_decision_support_rules.count({ where }),
  ]);
  // Map DB → DTO (dates/nullable fields, no native Date, no 'as')
  const data = results.map((rule) => ({
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
  }));
  // Build IPage.IPagination
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data,
  };
}
