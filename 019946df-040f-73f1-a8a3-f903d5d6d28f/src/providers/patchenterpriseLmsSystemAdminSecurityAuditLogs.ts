import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSecurityAuditLog";
import { IPageIEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSecurityAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list security audit log records with detailed filtering, full text
 * search, sorting, and pagination.
 *
 * This operation supports security monitoring dashboards and forensic
 * investigations for compliance teams.
 *
 * @param props - The systemAdmin payload and search request body
 * @param props.systemAdmin - Authenticated system administrator user
 * @param props.body - Search parameters for security audit logs
 * @returns Paginated search results matching the criteria
 * @throws {Error} If any database error occurs or invalid parameters
 */
export async function patchenterpriseLmsSystemAdminSecurityAuditLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSecurityAuditLog.IRequest;
}): Promise<IPageIEnterpriseLmsSecurityAuditLog.ISummary> {
  const { systemAdmin, body } = props;

  // Parse pagination parameters with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;

  // Construct the where clause
  const where: any = {
    deleted_at: null,
  };

  if (body.filterByAction !== undefined && body.filterByAction !== null) {
    where.action = body.filterByAction;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { action: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Parse sorting parameters
  const sortField = body.sort?.split(" ")[0] ?? "created_at";
  const sortOrder =
    (body.sort?.split(" ")[1] ?? "desc") === "asc" ? "asc" : "desc";

  const orderBy: any = {};
  if (sortField === "occurred_at" || sortField === "created_at") {
    orderBy.created_at = sortOrder;
  } else if (sortField === "updated_at") {
    orderBy.updated_at = sortOrder;
  } else {
    orderBy.created_at = "desc";
  }

  // Query database for results and total
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_security_audit_logs.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        user_id: true,
        action: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_security_audit_logs.count({ where }),
  ]);

  // Return paginated results with converted date strings
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      tenant_id: item.tenant_id ?? null,
      user_id: item.user_id ?? null,
      event_type: item.action,
      occurred_at: toISOStringSafe(item.created_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
