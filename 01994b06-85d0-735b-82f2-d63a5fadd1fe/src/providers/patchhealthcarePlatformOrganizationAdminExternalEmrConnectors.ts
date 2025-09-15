import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { IPageIHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformExternalEmrConnector";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of external EMR connector
 * configurations (table: healthcare_platform_external_emr_connectors).
 *
 * This operation fetches a filtered, paginated list of external EMR/EHR
 * connectors associated with the calling admin's organization. It supports
 * filtering by status, vendor type, search term, and last sync time, and
 * enables complex sorting and paging for integration dashboards and audits.
 * Only organization administrators may enumerate connectors, and sensitive
 * fields like connection_uri are never exposed. All date/timestamp fields are
 * returned as properly formatted ISO strings.
 *
 * @param props - Request props
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload
 * @param props.body - Filter, sort, and paging criteria as
 *   IHealthcarePlatformExternalEmrConnector.IRequest
 * @returns Paginated result: a page of
 *   IHealthcarePlatformExternalEmrConnector.ISummary records scoped to the
 *   admin's organization
 * @throws {Error} When unauthenticated or if any filtering errors occur
 */
export async function patchhealthcarePlatformOrganizationAdminExternalEmrConnectors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformExternalEmrConnector.IRequest;
}): Promise<IPageIHealthcarePlatformExternalEmrConnector.ISummary> {
  const { organizationAdmin, body } = props;
  // Defensive: Ensure org admin id is nonempty string uuid (basic enforcement)
  if (!organizationAdmin || !organizationAdmin.id)
    throw new Error("Unauthenticated organization admin");

  // Validate/sanitize paging
  const page = body.page && body.page > 0 ? body.page : 1;
  const pageSize = body.page_size && body.page_size > 0 ? body.page_size : 20;
  const offset = (page - 1) * pageSize;

  // Supported/allowed sort fields
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "connector_type",
    "status",
    "last_sync_at",
  ];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Query WHERE clause with only allowed fields
  const where = {
    healthcare_platform_organization_id: organizationAdmin.id,
    deleted_at: null,
    ...(body.connector_type !== undefined &&
    body.connector_type !== null &&
    body.connector_type.length > 0
      ? { connector_type: { contains: body.connector_type } }
      : {}),
    ...(body.status !== undefined &&
    body.status !== null &&
    body.status.length > 0
      ? { status: body.status }
      : {}),
    ...((body.last_sync_at_min !== undefined &&
      body.last_sync_at_min !== null) ||
    (body.last_sync_at_max !== undefined && body.last_sync_at_max !== null)
      ? {
          last_sync_at: {
            ...(body.last_sync_at_min !== undefined &&
            body.last_sync_at_min !== null
              ? { gte: body.last_sync_at_min }
              : {}),
            ...(body.last_sync_at_max !== undefined &&
            body.last_sync_at_max !== null
              ? { lte: body.last_sync_at_max }
              : {}),
          },
        }
      : {}),
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
      ? {
          OR: [
            { connector_type: { contains: body.search } },
            { status: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Query data and total count in parallel for performance
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_external_emr_connectors.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        connector_type: true,
        status: true,
        last_sync_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_external_emr_connectors.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => {
      return {
        id: row.id,
        healthcare_platform_organization_id:
          row.healthcare_platform_organization_id,
        connector_type: row.connector_type,
        status: row.status,
        last_sync_at: row.last_sync_at
          ? toISOStringSafe(row.last_sync_at)
          : undefined,
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at: row.deleted_at
          ? toISOStringSafe(row.deleted_at)
          : undefined,
      };
    }),
  };
}
