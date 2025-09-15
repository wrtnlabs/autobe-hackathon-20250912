import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import { IPageIHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDataExportLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of data export log events from
 * healthcare_platform_data_export_logs.
 *
 * This endpoint lets a system admin audit historical export operations, with
 * filters for export type, justification, status, destination, and time range.
 * Results never include PHI fields or file URIs.
 *
 * @param props - Input props for search
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the query
 * @param props.body - Filter, sort, and pagination options
 *   (IHealthcarePlatformDataExportLog.IRequest)
 * @returns Paginated list of export logs
 *   (IPageIHealthcarePlatformDataExportLog.ISummary) matching the filters
 * @throws {Error} If a sort field is supplied that does not match allowed
 *   columns (created_at, status, export_type)
 */
export async function patchhealthcarePlatformSystemAdminDataExportLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDataExportLog.IRequest;
}): Promise<IPageIHealthcarePlatformDataExportLog.ISummary> {
  const { body } = props;

  // Pagination parameters
  const page: number =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const size: number =
    typeof body.size === "number" && body.size > 0 ? body.size : 20;
  const skip: number = (page - 1) * size;
  const take: number = size;

  // Parse sort: allow only certain fields, default to created_at desc
  let orderByField: "created_at" | "status" | "export_type" = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (typeof body.sort === "string") {
    const [maybeField, maybeDirection] = body.sort.trim().split(/\s+/);
    if (
      maybeField === "created_at" ||
      maybeField === "status" ||
      maybeField === "export_type"
    ) {
      orderByField = maybeField;
      if (maybeDirection === "asc" || maybeDirection === "desc")
        orderByDirection = maybeDirection;
    }
  }

  // Build where condition
  const where = {
    ...(body.export_type !== undefined &&
      body.export_type !== null && {
        export_type: body.export_type,
      }),
    ...(body.exported_data_scope !== undefined &&
      body.exported_data_scope !== null && {
        exported_data_scope: body.exported_data_scope,
      }),
    ...(body.justification !== undefined &&
      body.justification !== null && {
        justification: body.justification,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.destination !== undefined &&
      body.destination !== null && {
        destination: body.destination,
      }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
  };

  // Query paginated data and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_data_export_logs.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
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

  // Map rows to ISummary, format UUID and date fields
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id ?? undefined,
    organization_id: row.organization_id ?? undefined,
    export_type: row.export_type,
    destination: row.destination ?? undefined,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination information as per IPage.IPagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(size),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(size)),
    },
    data,
  };
}
