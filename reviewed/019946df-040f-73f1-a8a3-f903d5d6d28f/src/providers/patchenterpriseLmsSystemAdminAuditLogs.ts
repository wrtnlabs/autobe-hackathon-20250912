import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAuditLog";
import { IPageIEnterpriseLmsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Searches and retrieves a paginated list of enterprise LMS audit log
 * summaries.
 *
 * This operation supports filtering by tenant ID, user ID, search keywords over
 * action and description, sorting by specified fields, and pagination controls.
 * Data returned conforms to the IPageIEnterpriseLmsAuditLog.ISummary schema.
 *
 * Authorization is restricted to users with 'systemAdmin' role, as audit logs
 * contain sensitive system-wide event data.
 *
 * @param props - The properties containing the authenticated systemAdmin
 *   payload and filtering criteria.
 * @param props.systemAdmin - Authenticated systemAdmin user payload.
 * @param props.body - Filtering, search, and pagination criteria.
 * @returns A paginated summary of audit logs matching the given filters and
 *   pagination.
 * @throws {Error} Throws if any unhandled database or unexpected errors occur.
 */
export async function patchenterpriseLmsSystemAdminAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsAuditLog.IRequest;
}): Promise<IPageIEnterpriseLmsAuditLog.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (body.tenantId !== undefined && body.tenantId !== null) {
    where.enterprise_lms_tenant_id = body.tenantId;
  }
  if (body.userId !== undefined && body.userId !== null) {
    where.user_id = body.userId;
  }

  if (body.search) {
    where.OR = [
      { action: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  if (body.orderBy) {
    const allowedSortFields = new Set(["created_at", "action", "description"]);
    let sortField = body.orderBy;
    if (!allowedSortFields.has(sortField)) {
      sortField = "created_at";
    }
    const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

    const [results, total] = await Promise.all([
      MyGlobal.prisma.enterprise_lms_audit_logs.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take: limit,
        select: {
          action: true,
          description: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.enterprise_lms_audit_logs.count({ where }),
    ]);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: results.map((log) => ({
        action: log.action,
        description: log.description ?? null,
        created_at: toISOStringSafe(log.created_at),
      })),
    };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        action: true,
        description: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_audit_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((log) => ({
      action: log.action,
      description: log.description ?? null,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
