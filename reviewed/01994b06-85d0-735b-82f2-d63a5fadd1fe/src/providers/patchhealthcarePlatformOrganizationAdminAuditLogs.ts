import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLog";
import { IPageIHealthcarePlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated, filterable list of audit logs for compliance
 * and security audit.
 *
 * This operation allows organization admin users to efficiently retrieve audit
 * logs for their own organization, providing advanced filtering options by
 * actor, action type, organization, date range, and affected business entity.
 * Results are paginated and sortable, supporting compliance and security
 * monitoring, with enforcement that admins may only access logs for their
 * assigned organization.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   (JWT payload)
 * @param props.body - Search/filter parameters for audit logs (actor,
 *   organization, action type, date range, entity, pagination, sorting)
 * @returns Paginated list of audit log entry summaries matching the provided
 *   criteria
 * @throws {Error} When querying logs for an organization other than the
 *   authenticated user's org
 */
export async function patchhealthcarePlatformOrganizationAdminAuditLogs(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAuditLog.IRequest;
}): Promise<IPageIHealthcarePlatformAuditLog.ISummary> {
  const { organizationAdmin, body } = props;

  // Authorization: Only allow query for their own organization
  if (!body.organization || organizationAdmin.id !== body.organization) {
    throw new Error(
      "Forbidden: You do not have access to this organization's audit logs.",
    );
  }

  // Extract and validate pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  // Defensive coercion to plain numbers for compliance with pagination tags
  const skip = (page - 1) * limit;

  // Construct where clause inline for Prisma
  const where = {
    organization_id: body.organization,
    ...(body.actor ? { user_id: body.actor } : {}),
    ...(body.action_type ? { action_type: body.action_type } : {}),
    ...(body.related_entity_type
      ? { related_entity_type: body.related_entity_type }
      : {}),
    ...(body.related_entity_id
      ? { related_entity_id: body.related_entity_id }
      : {}),
    ...(body.from && body.to
      ? { created_at: { gte: body.from, lte: body.to } }
      : body.from
        ? { created_at: { gte: body.from } }
        : body.to
          ? { created_at: { lte: body.to } }
          : {}),
  };

  // OrderBy logic: default to created_at desc if not provided, else field:direction
  const orderBy = body.sort
    ? (() => {
        const [field, direction] = body.sort.split(":");
        return { [field]: direction === "asc" ? "asc" : "desc" };
      })()
    : { created_at: "desc" };

  // Fetch results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_audit_logs.findMany({
      where,
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        action_type: true,
        related_entity_type: true,
        related_entity_id: true,
        created_at: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_audit_logs.count({ where }),
  ]);

  // Map results to DTO, with ISO string conversion for dates and optional fields
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id ?? undefined,
    organization_id: row.organization_id ?? undefined,
    action_type: row.action_type,
    related_entity_type: row.related_entity_type ?? undefined,
    related_entity_id: row.related_entity_id ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Compute total pages, coerce pagination to int32
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
