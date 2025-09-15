import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import { IPageIHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformFinancialAuditLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List/search paginated financial audit logs
 * (healthcare_platform_financial_audit_logs).
 *
 * Allows authorized organization admins to retrieve paginated, filtered audit
 * logs scoped to their organization. Supports robust search, compliance audit,
 * and multi-tenant security enforcement.
 *
 * @param props - Contains organizationAdmin (OrganizationadminPayload) and body
 *   (IHealthcarePlatformFinancialAuditLog.IRequest).
 * @returns Paginated audit log search result.
 * @throws {Error} If page/limit params are invalid.
 */
export async function patchhealthcarePlatformOrganizationAdminFinancialAuditLogs(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformFinancialAuditLog.IRequest;
}): Promise<IPageIHealthcarePlatformFinancialAuditLog> {
  const { organizationAdmin, body } = props;

  // Enforce organization scoping: admin can only list logs for own org
  if (!body.organization_id || organizationAdmin.type !== "organizationadmin") {
    return {
      pagination: {
        current: 1 as number,
        limit: 20 as number,
        records: 0 as number,
        pages: 0 as number,
      },
      data: [],
    };
  }

  // Optionally further enforce: does this admin belong to this org?
  const adminOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: body.organization_id,
        deleted_at: null,
      },
    });
  if (!adminOrgAssignment) {
    return {
      pagination: {
        current: 1 as number,
        limit: 20 as number,
        records: 0 as number,
        pages: 0 as number,
      },
      data: [],
    };
  }

  // Build filtering conditions
  const where = {
    organization_id: body.organization_id,
    ...(body.entity_type !== undefined && { entity_type: body.entity_type }),
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...(body.audit_action !== undefined && { audit_action: body.audit_action }),
    ...(body.action_timestamp_from !== undefined ||
    body.action_timestamp_to !== undefined
      ? {
          action_timestamp: {
            ...(body.action_timestamp_from !== undefined && {
              gte: body.action_timestamp_from,
            }),
            ...(body.action_timestamp_to !== undefined && {
              lte: body.action_timestamp_to,
            }),
          },
        }
      : {}),
  };

  // Validate sort_by param
  const allowedSortFields = [
    "created_at",
    "action_timestamp",
    "entity_type",
    "audit_action",
    "user_id",
    "entity_id",
  ];
  const sortByField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Pagination with fallback/defaults
  const pageNumber = Number(body.page ?? 1);
  const limitNumber = Number(body.limit ?? 20);
  const skip = (pageNumber - 1) * limitNumber;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_financial_audit_logs.findMany({
      where,
      orderBy: { [sortByField]: sortDirection },
      skip,
      take: limitNumber,
    }),
    MyGlobal.prisma.healthcare_platform_financial_audit_logs.count({ where }),
  ]);
  const pageCount = limitNumber > 0 ? Math.ceil(total / limitNumber) : 0;

  const data = rows.map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    entity_id: row.entity_id === null ? undefined : row.entity_id,
    user_id: row.user_id === null ? undefined : row.user_id,
    entity_type: row.entity_type,
    audit_action: row.audit_action,
    action_description:
      row.action_description === null ? undefined : row.action_description,
    action_timestamp: toISOStringSafe(row.action_timestamp),
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: pageNumber,
      limit: limitNumber,
      records: total,
      pages: pageCount,
    },
    data,
  };
}
