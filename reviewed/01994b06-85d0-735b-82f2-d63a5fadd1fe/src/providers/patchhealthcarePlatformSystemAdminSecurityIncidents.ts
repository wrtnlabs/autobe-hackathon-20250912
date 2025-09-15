import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import { IPageIHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformSecurityIncident";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filterable list of security incidents from
 * healthcare_platform_security_incidents.
 *
 * This endpoint allows a platform system administrator to query security
 * incidents for reporting, audit, and forensic purposes. Supports filtering by
 * organization, status, type, severity, opened_at date window, and summary
 * text. Returns result as paginated summary objects. Only metadata (never PHI)
 * is included.
 *
 * @param props - Input props
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.body - Filter, pagination, and sort options
 * @returns Paginated security incident summaries matching filter/search
 *   criteria
 * @throws {Error} If validation errors on input or query construction
 */
export async function patchhealthcarePlatformSystemAdminSecurityIncidents(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformSecurityIncident.IRequest;
}): Promise<IPageIHealthcarePlatformSecurityIncident.ISummary> {
  const { body } = props;

  // Pagination: ensure safe numeric type (strip typia tags for Prisma math)
  const page = (body.page ?? 1) as number;
  const pageSize = (body.page_size ?? 20) as number;

  if (page < 1 || pageSize < 1)
    throw new Error("Pagination parameters must be positive");

  // Build where clause for Prisma (schema-first, safely skip null/undefined)
  const where = {
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.incident_type !== undefined &&
      body.incident_type.length > 0 && {
        incident_type: body.incident_type,
      }),
    ...(body.status !== undefined &&
      body.status.length > 0 && {
        status: body.status,
      }),
    ...(body.severity !== undefined &&
      body.severity.length > 0 && {
        severity: body.severity,
      }),
    ...(((body.opened_at_from !== undefined && body.opened_at_from !== null) ||
      (body.opened_at_to !== undefined && body.opened_at_to !== null)) && {
      opened_at: {
        ...(body.opened_at_from !== undefined &&
          body.opened_at_from !== null && {
            gte: body.opened_at_from,
          }),
        ...(body.opened_at_to !== undefined &&
          body.opened_at_to !== null && {
            lte: body.opened_at_to,
          }),
      },
    }),
    ...(body.summary_contains !== undefined &&
      body.summary_contains.length > 0 && {
        summary: {
          contains: body.summary_contains,
        },
      }),
  };

  // Sort options: only allow safe, schema-reviewed fields
  const allowedSortFields = [
    "opened_at",
    "severity",
    "status",
    "incident_type",
  ];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "opened_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Query results + total for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_security_incidents.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        organization_id: true,
        incident_type: true,
        status: true,
        severity: true,
        opened_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_security_incidents.count({ where }),
  ]);

  // Map DB rows (Date/nullable fields) to strictly-branded summary output
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      organization_id:
        row.organization_id === null ? undefined : row.organization_id,
      incident_type: row.incident_type,
      status: row.status,
      severity: row.severity,
      opened_at: toISOStringSafe(row.opened_at),
    })),
  };
}
