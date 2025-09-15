import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import { IPageIHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformExternalEmrConnector";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of external EMR connector
 * configurations (table: healthcare_platform_external_emr_connectors).
 *
 * This endpoint allows system administrators to query and review the set of
 * external EMR/EHR connector integrations configured for interoperability with
 * third-party vendors. Offers robust filtering by vendor type, organization,
 * status, date ranges, and full-text search. Supports advanced pagination and
 * sorting for use in dashboards, audits, and readiness checks. Sensitive
 * information such as connection URIs is never returned via this API.
 *
 * @param props - Parameters for this query
 * @param props.systemAdmin - The authenticated system administrator issuing the
 *   query
 * @param props.body - Query, sorting, and pagination filters
 * @returns Paginated list of connector configuration summaries, suitable for
 *   integration management dashboards
 * @throws {Error} When page or page_size are less than 1, or when invalid sort
 *   field supplied
 */
export async function patchhealthcarePlatformSystemAdminExternalEmrConnectors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformExternalEmrConnector.IRequest;
}): Promise<IPageIHealthcarePlatformExternalEmrConnector.ISummary> {
  const { body } = props;

  // Validate pagination
  const page = body.page !== undefined ? body.page : 1;
  const page_size = body.page_size !== undefined ? body.page_size : 20;
  if (page < 1 || page_size < 1)
    throw new Error("Invalid page or page_size: must be >= 1");
  const skip = (page - 1) * page_size;

  // Allowed fields for sorting
  const allowedSortFields = [
    "id",
    "connector_type",
    "status",
    "last_sync_at",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const sort_by =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Build where condition
  const where: Record<string, unknown> = {};
  if (body.connector_type !== undefined && body.connector_type !== null) {
    where.connector_type = { contains: body.connector_type };
  }
  if (body.status !== undefined && body.status !== null) {
    where.status = { contains: body.status };
  }
  if (
    body.healthcare_platform_organization_id !== undefined &&
    body.healthcare_platform_organization_id !== null
  ) {
    where.healthcare_platform_organization_id =
      body.healthcare_platform_organization_id;
  }
  // last_sync_at_min/max - combine for range query
  if (
    (body.last_sync_at_min !== undefined && body.last_sync_at_min !== null) ||
    (body.last_sync_at_max !== undefined && body.last_sync_at_max !== null)
  ) {
    where.last_sync_at = {
      ...(body.last_sync_at_min !== undefined && body.last_sync_at_min !== null
        ? { gte: body.last_sync_at_min }
        : {}),
      ...(body.last_sync_at_max !== undefined && body.last_sync_at_max !== null
        ? { lte: body.last_sync_at_max }
        : {}),
    };
  }
  // Full-text search (search) on string fields only
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.OR = [
      { connector_type: { contains: body.search } },
      { connection_uri: { contains: body.search } },
      { status: { contains: body.search } },
    ];
  }

  // Query DB for rows and record count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_external_emr_connectors.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_external_emr_connectors.count({
      where,
    }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      connector_type: row.connector_type,
      status: row.status,
      last_sync_at:
        row.last_sync_at != null
          ? toISOStringSafe(row.last_sync_at)
          : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at != null ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(page_size)),
    },
    data,
  };
}
