import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import { IPageIHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAccessLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated, filterable list of access logs for
 * compliance and access reporting.
 *
 * This endpoint allows organization admins to audit and monitor all resource
 * access read/view events within their assigned organization, supporting
 * advanced filtering by actor (user), resource type, resource ID, date range,
 * and pagination controls. Results are filtered strictly to the organization
 * the admin is assigned to. Sorting can be performed on indexed fields.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - The filter and pagination criteria for searching logs
 * @returns Paginated access logs summaries matching filter criteria
 * @throws {Error} When the organization admin lacks a valid organization
 *   assignment
 * @throws {Error} If sort field is invalid or query fails
 */
export async function patchhealthcarePlatformOrganizationAdminAccessLogs(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAccessLog.IRequest;
}): Promise<IPageIHealthcarePlatformAccessLog.ISummary> {
  const { organizationAdmin, body } = props;

  // Ensure safe pagination inputs
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 100;
  const page = Number(pageRaw) > 0 ? Number(pageRaw) : 1;
  const limit = Math.min(Math.max(Number(limitRaw), 1), 1000);
  const skip = (page - 1) * limit;

  // Find the organization for this organizationAdmin
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!orgAssignment || !orgAssignment.healthcare_platform_organization_id)
    throw new Error(
      "Organization admin does not have an active organization assignment.",
    );
  const organizationId = orgAssignment.healthcare_platform_organization_id;

  // Allowed sort fields
  const SORT_WHITELIST = ["created_at", "resource_type", "user_id", "id"];
  const sortParam = body.sort ?? "created_at:desc";
  const [sortFieldRaw, sortOrderRaw] = sortParam.split(":");
  const sortField = SORT_WHITELIST.includes(sortFieldRaw)
    ? sortFieldRaw
    : "created_at";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  // Build Prisma where clause with strict optional checks
  const where = {
    organization_id: organizationId,
    // Only include logs with non-null organization
    ...(body.actor !== undefined &&
      body.actor !== null && { user_id: body.actor }),
    ...(body.resource_type !== undefined &&
      body.resource_type !== null && { resource_type: body.resource_type }),
    ...(body.resource_id !== undefined &&
      body.resource_id !== null && { resource_id: body.resource_id }),
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

  // Fetch data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_access_logs.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        resource_type: true,
        resource_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_access_logs.count({ where }),
  ]);

  // Transform to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id!, // guaranteed by query (org admin always has assigned org)
    organization_id: row.organization_id!,
    resource_type: row.resource_type,
    resource_id: row.resource_id === null ? undefined : row.resource_id,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
