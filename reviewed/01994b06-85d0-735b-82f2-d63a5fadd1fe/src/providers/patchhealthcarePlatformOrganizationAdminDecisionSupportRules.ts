import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import { IPageIHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDecisionSupportRule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated, filterable list of clinical decision support
 * (CDS) rules in the healthcare platform.
 *
 * This endpoint allows privileged clinical administrators and analytics roles
 * to search, filter, and sort CDS rules relevant to their organization or
 * department context. Only administrators scoped to the organization may access
 * rules from their own tenant. Supports multi-field search, sorting,
 * pagination, and excludes soft-deleted records.
 *
 * @param props - Input properties
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.body - Advanced search/filter criteria
 * @returns Paginated, filtered list of CDS rules matching the provided search
 *   criteria
 * @throws {Error} If authorization fails or unexpected error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminDecisionSupportRules(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDecisionSupportRule.IRequest;
}): Promise<IPageIHealthcarePlatformDecisionSupportRule> {
  const { organizationAdmin, body } = props;
  // Always scope query to the authenticated admin's organization
  const orgId = organizationAdmin.id;

  // Clean pagination defaults, always return valid int32 minimum 1
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Compose type-safe where clause only with verified fields
  const where = {
    organization_id: orgId,
    deleted_at: null,
    ...(body.rule_code !== undefined &&
      body.rule_code !== null &&
      body.rule_code.length > 0 && {
        rule_code: { contains: body.rule_code },
      }),
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && {
        title: { contains: body.title },
      }),
    ...(body.is_enabled !== undefined && { is_enabled: body.is_enabled }),
    ...(body.trigger_event !== undefined &&
      body.trigger_event !== null &&
      body.trigger_event.length > 0 && {
        trigger_event: body.trigger_event,
      }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined &&
          body.created_at_from !== null && { gte: body.created_at_from }),
        ...(body.created_at_to !== undefined &&
          body.created_at_to !== null && { lte: body.created_at_to }),
      },
    }),
  };

  // Sorting. Default: created_at desc. Only allow known fields.
  const knownSortFields = [
    "created_at",
    "updated_at",
    "title",
    "rule_code",
    "is_enabled",
    "trigger_event",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [sortField, sortDir = "desc"] = body.sort.trim().split(/\s+/);
    if (knownSortFields.includes(sortField)) {
      orderBy = { [sortField]: sortDir === "asc" ? "asc" : "desc" };
    }
  }

  // Query records and count
  const [rules, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_decision_support_rules.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_decision_support_rules.count({ where }),
  ]);

  // Output mapping: guarantee API types, string/brand enforcement
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: rules.map((rule) => {
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
        deleted_at: rule.deleted_at
          ? toISOStringSafe(rule.deleted_at)
          : undefined,
      };
    }),
  };
}
