import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import { IPageIHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filterable list of audit logs for compliance
 * and security audit.
 *
 * This operation returns a paginated, filterable list of audit logs, allowing
 * administrative and compliance staff to monitor system actions, investigate
 * events, and ensure regulatory adherence. Supports advanced filtering by
 * actor, organization, action_type, related_resource, and date range, as well
 * as configurable sorting and robust pagination. Only allowed for authenticated
 * System Admin users. Sensitive context is omitted from summary response.
 *
 * @param props - The request parameters.
 * @param props.systemAdmin - The authenticated Systemadmin user payload.
 * @param props.body - The filter/search/sort and pagination criteria for the
 *   audit log query.
 * @returns Paginated list of audit log summaries matching the filters.
 * @throws {Error} If filters are invalid or database access fails.
 */
export async function patchhealthcarePlatformSystemAdminAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAuditLog.IRequest;
}): Promise<IPageIHealthcarePlatformAuditLog.ISummary> {
  const { body } = props;
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  let limit =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 100;
  if (limit > 1000) limit = 1000;

  // Dynamic where clause - only fields that actually exist
  const where = {
    ...(body.actor !== undefined &&
      body.actor !== null && { user_id: body.actor }),
    ...(body.organization !== undefined &&
      body.organization !== null && { organization_id: body.organization }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
    ...(body.related_entity_type !== undefined &&
      body.related_entity_type !== null && {
        related_entity_type: body.related_entity_type,
      }),
    ...(body.related_entity_id !== undefined &&
      body.related_entity_id !== null && {
        related_entity_id: body.related_entity_id,
      }),
    ...((body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
      ? {
          created_at: {
            ...(body.from !== undefined &&
              body.from !== null && { gte: body.from }),
            ...(body.to !== undefined && body.to !== null && { lte: body.to }),
          },
        }
      : {}),
  };

  // Handle sort (default: created_at desc)
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [field, direction] = body.sort.split(":");
    if (
      field &&
      [
        "id",
        "user_id",
        "organization_id",
        "action_type",
        "related_entity_type",
        "related_entity_id",
        "created_at",
      ].includes(field)
    ) {
      orderBy = {
        [field]: direction === "asc" ? "asc" : "desc",
      };
    }
  }

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_audit_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        action_type: true,
        related_entity_type: true,
        related_entity_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_audit_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id === null ? undefined : row.user_id,
      organization_id:
        row.organization_id === null ? undefined : row.organization_id,
      action_type: row.action_type,
      related_entity_type:
        row.related_entity_type === null ? undefined : row.related_entity_type,
      related_entity_id:
        row.related_entity_id === null ? undefined : row.related_entity_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
