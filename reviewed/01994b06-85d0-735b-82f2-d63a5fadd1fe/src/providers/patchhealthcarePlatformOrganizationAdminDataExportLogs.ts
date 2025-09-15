import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import { IPageIHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDataExportLog";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of data export log events from
 * healthcare_platform_data_export_logs.
 *
 * Retrieves paginated and filterable export log records scoped to the
 * authenticated organizationAdmin's organization. Filters include export_type,
 * status, justification, destination, and created_at date range. Pagination and
 * sorting are supported. All results exclude PHI and are read-only audit
 * metadata only.
 *
 * @param props - Props for the request
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.body - Filtering, sorting, and pagination options
 * @returns Paginated summary list of data export log records
 */
export async function patchhealthcarePlatformOrganizationAdminDataExportLogs(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDataExportLog.IRequest;
}): Promise<IPageIHealthcarePlatformDataExportLog.ISummary> {
  const adminOrgId = props.organizationAdmin.id;
  const body = props.body || {};
  // Default values for pagination
  const rawPage = body.page != null ? body.page : 1;
  const rawSize = body.size != null ? body.size : 20;
  // Remove Typia tags (brands) for pagination numeric types
  const page = Number(rawPage);
  const size = Number(rawSize);
  // Protect against out-of-range page/size
  const safePage = page > 0 ? page : 1;
  const safeSize = size > 0 ? size : 20;
  const skip = (safePage - 1) * safeSize;
  const take = safeSize;

  // Only allow sort by "created_at" asc/desc, default to desc
  let orderBy: { created_at: "asc" | "desc" } = { created_at: "desc" };
  if (
    typeof body.sort === "string" &&
    /^created_at ?(asc|desc)?$/i.test(body.sort.trim())
  ) {
    if (/asc$/i.test(body.sort.trim())) orderBy = { created_at: "asc" };
  }

  // Build Prisma where clause inline (never create intermediate)
  const where = {
    organization_id: adminOrgId,
    ...(body.export_type !== undefined &&
      body.export_type !== null && { export_type: body.export_type }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.justification !== undefined &&
      body.justification !== null && { justification: body.justification }),
    ...(body.exported_data_scope !== undefined &&
      body.exported_data_scope !== null && {
        exported_data_scope: body.exported_data_scope,
      }),
    ...(body.destination !== undefined &&
      body.destination !== null && { destination: body.destination }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && { gte: body.from_date }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && { lte: body.to_date }),
          },
        }
      : {}),
  };

  // Perform queries in parallel for data and total records
  const [results, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_data_export_logs.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        export_type: true,
        destination: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_data_export_logs.count({ where }),
  ]);

  // Map Prisma output to ISummary per DTO spec (always convert date, never use as or Date)
  const data = results.map((row) => ({
    id: row.id,
    user_id: row.user_id === null ? undefined : row.user_id,
    organization_id:
      row.organization_id === null ? undefined : row.organization_id,
    export_type: row.export_type,
    destination: row.destination === null ? undefined : row.destination,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeSize),
      records: total,
      pages: Math.ceil(total / safeSize),
    },
    data,
  };
}
